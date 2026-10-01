# Implementation Plan — Module 08: AI Research Assistant (Cross-Cutting)

> **Document:** Module 08 Implementation Plan
> **Location:** `docs/plans/08-ai-assistant-plan.md`
> **Status:** Completed (All 13 Phases Executed & Verified)
> **Reference Specs:** [docs/specs/08-ai-assistant.md](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/docs/specs/08-ai-assistant.md), [docs/data-model.md](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/docs/data-model.md), [docs/feature-plan.md](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/docs/feature-plan.md), [AGENTS.md](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/AGENTS.md)
> **Depends on:** Spec 01 (Auth/RBAC), Spec 02 (Research Workspace), Spec 03 (Literature Manager), Spec 04 (Experiment Tracker), Spec 05 (Writing & Review), pgvector already enabled via `20260814000000_enable_pgvector.sql`
> **Agent Mode:** Plan mode — Review-driven autonomy. Provider integration, prompt policy, quota enforcement, data filtering, and cost tracking require explicit review before execution.

---

## Table of Contents

1. [Contradictions & Limitations Discovered](#1-contradictions--limitations-discovered)
2. [Core Architectural & Privacy Rules](#2-core-architectural--privacy-rules)
3. [Sub-Feature Phasing Map](#3-sub-feature-phasing-map)
4. [Phase 8.1: Database Migration & Shared Contracts](#phase-81-database-migration--shared-contracts)
5. [Phase 8.2: Backend — AI Provider Adapter Layer](#phase-82-backend--ai-provider-adapter-layer)
6. [Phase 8.3: Backend — PDF Embedding Pipeline](#phase-83-backend--pdf-embedding-pipeline)
7. [Phase 8.4: Backend — Semantic Search Service](#phase-84-backend--semantic-search-service)
8. [Phase 8.5: Backend — Paper Summarization & Sidebar Suggestions](#phase-85-backend--paper-summarization--sidebar-suggestions)
9. [Phase 8.6: Backend — Writing Assistance & Experiment Insight](#phase-86-backend--writing-assistance--experiment-insight)
10. [Phase 8.7: Backend — Supervisor Progress Reports](#phase-87-backend--supervisor-progress-reports)
11. [Phase 8.8: Backend — Quota, Blocked-Prompt & Admin Config APIs](#phase-88-backend--quota-blocked-prompt--admin-config-apis)
12. [Phase 8.9: Frontend — AI Sidebar & Suggestion UX](#phase-89-frontend--ai-sidebar--suggestion-ux)
13. [Phase 8.10: Frontend — Semantic Search UI](#phase-810-frontend--semantic-search-ui)
14. [Phase 8.11: Frontend — Writing Assistance Integration](#phase-811-frontend--writing-assistance-integration)
15. [Phase 8.12: Frontend — Admin AI Config Panel](#phase-812-frontend--admin-ai-config-panel)
16. [Phase 8.13: End-to-End Verification & Documentation Update](#phase-813-end-to-end-verification--documentation-update)
17. [Verification Plan & Test Cases](#17-verification-plan--test-cases)
18. [Execution Progress & Activity Log](#18-execution-progress--activity-log)

---

## 1. Contradictions & Limitations Discovered

> **IMPORTANT:** The following issues were found during the documentation review. They must be resolved before or during implementation.

### Contradiction 1: AiSuggestion `targetType` Scope — Spec vs. Data Model

**Spec 08 states:**
```
AiSuggestion {
  targetType enum(PaperSidebarFields)
  ...
}
```
The spec restricts `targetType` to only `PaperSidebarFields`. However, the spec also describes **writing assistance** (paraphrase, grammar, section outline suggestion) that applies to `ManuscriptSection` content. There is no entity defined to persist those suggestions.

**Resolution adopted in this plan:**
- `targetType` will be `enum(PaperSidebarFields, ManuscriptSection)` to cover both documented use cases.
- Writing assistance suggestions that directly modify `ManuscriptSection.content` must still set `isAiAssisted = true` on the target section.
- Suggestions always remain `Pending` until the author explicitly accepts — no silent write-back.

---

### Contradiction 2: `AiSuggestion.userId` — Ownership Column Missing

The data model entry for `AiSuggestion` does not include a `userId` FK. Without it, the `GET /ai/suggestions` endpoint (which should return only the **owner's** suggestions) cannot enforce the ownership rule stated in the spec.

**Resolution:** Add `userId FK->User` as a non-nullable column in the migration. Derived server-side from the verified JWT — never trusted from the client.

---

### Limitation 1: Embedding Vector Dimension `N` Not Specified

The spec defines `vector(N)` without specifying N. Different provider models produce different dimensions:
- OpenAI `text-embedding-3-small` — 1536-dim
- Gemini `text-embedding-004` — 768-dim

**Resolution:** Default to **768-dim** (`vector(768)`) in the migration to match the Gemini `text-embedding-004` model (active free-tier provider). Admin must configure provider before embeddings are generated. A startup guard logs a warning if no `AiProviderConfig` row exists.

---

### Limitation 2: Synchronous Embedding on PDF Upload is Slow

The spec states the pipeline is `PDF -> Text Extraction -> Chunking -> Embedding -> pgvector`. For large PDFs, a synchronous call to the AI provider's embedding API inside the paper upload request will noticeably delay the response.

**Resolution:** Embedding is **triggered asynchronously** after Paper + FileAsset records are created. A manual re-trigger endpoint `POST /ai/papers/:paperId/embed` is available. `build-plan.md` notes: "Revisit BullMQ+Redis here only if synchronous embedding generation proves too slow." In v1, a fire-and-forget background call with error logging is used per scope discipline.

---

### Limitation 3: `BlockedPromptRule.pattern` — No Regex Execution Defined

The spec declares a `BlockedPromptRule` entity with a `pattern` field, but does not specify whether the pattern is a plain string match, a regex, or a keyword list.

**Resolution:** Patterns are stored as plain strings and evaluated as **case-insensitive substring matches** against the assembled prompt before the provider call. Regex support is out of scope for v1 to avoid ReDoS risk.

---

### Limitation 4: `AiProviderConfig.apiKeyRef` — Storage Strategy

The spec says `apiKeyRef` (not `apiKey`) implying a reference, not the raw key. However, the project does not currently use a secrets manager.

**Resolution:** In v1, `apiKeyRef` stores the **name of the environment variable** that holds the actual API key (e.g., `"OPENAI_API_KEY"`). The Express backend reads `process.env[apiKeyRef]` at call time. The raw key never touches the database.

---

### Limitation 5: `ProgressReport` — No Realtime or Streaming

Supervisor progress summary involves assembling data across multiple tables for large projects.

**Resolution:** Reports are generated synchronously and cached as a `ProgressReport` row. The API returns the cached version if one exists for the requested period; re-generation is triggered on explicit request.

---

### Limitation 6: No Existing `ai.routes.ts` — Must Not Break Existing Routes

The current `apps/api/src/index.ts` mounts 16 route files. Adding a new `ai.routes.ts` must follow the exact same pattern without touching existing route mounts.

---

## 2. Core Architectural & Privacy Rules

### 2.1 AI Access Never Expands Authorization Scope

This is the most critical security invariant of this module:

```
A user's AI features operate ONLY over data they can already access
through normal application authorization rules.

AI must never be a vector to read another user's private data.
```

Concretely:
- Semantic search must filter embeddings by `ownerId = req.userId` BEFORE assembling the model prompt.
- Paper summarization requires the paper is accessible to the requesting user.
- Experiment insight requires the same access check as `GET /experiments/:id`.
- Supervisor progress summaries are scoped to `Project.ownerId = supervisorId`.

### 2.2 Provider-Agnostic Adapter Pattern

All AI calls go through a single adapter interface:

```typescript
interface AIProvider {
  generateText(prompt: string, options?: TextOptions): Promise<{ text: string; tokensUsed: number }>;
  generateEmbedding(text: string): Promise<number[]>;
  estimateTokens(text: string): number;
}
```

The adapter resolves the active provider from `AiProviderConfig` at runtime. Express never exposes which provider is active to the frontend.

### 2.3 Suggestion Lifecycle — Human-In-The-Loop Mandatory

```
AI generates suggestion
     |
AiSuggestion row created (status = Pending)
     |
User reviews suggestion in UI
     |
Accept -> write to source field  |  Reject -> no mutation
```

No background process may silently accept a suggestion.

### 2.4 isAiAssisted Flag — Transparency Requirement

Any `ManuscriptSection.content` populated or substantially modified via AI writing assistance must have `isAiAssisted = true` set server-side when the suggestion is accepted.

### 2.5 Usage Logging — Always Before Response

`AiUsageLog` rows are written before returning the AI result to the caller. If the log insert fails, the request still completes but the error is recorded in the server log.

### 2.6 Monthly Quota Enforcement — Server-Side Only

```
On every AI feature request:
1. Read AiQuota for req.user.role
2. Sum AiUsageLog.tokensUsed WHERE userId = req.userId
   AND createdAt >= start of current month
3. If sum + estimatedTokensForRequest > monthlyTokenLimit -> 429 Too Many Requests
4. Proceed with AI call
5. Write AiUsageLog with actual tokensUsed
```

Clients cannot self-report or modify their own quota.

### 2.7 Blocked Prompt Policy — Server-Side Only

Blocked-prompt evaluation happens in the adapter layer after the prompt is assembled and before the provider call. If a match is found: return `400 Bad Request` and write an `AiUsageLog` with `tokensUsed = 0` and feature `"blocked"`.

---

## 3. Sub-Feature Phasing Map

```
+--------------------------------------------------------------------------+
| Phase 8.1: Database Migration & Shared Contracts                         |
|  -- 7 new tables, enums, pgvector function, RLS policies, shared DTOs    |
+--------------------------------------------------------------------------+
| Phase 8.2: Backend — AI Provider Adapter Layer                           |
|  -- Provider-agnostic interface, OpenAI & Gemini implementations,        |
|     adapter factory, token counting, blocked-prompt, quota services      |
+--------------------------------------------------------------------------+
| Phase 8.3: Backend — PDF Embedding Pipeline                              |
|  -- Text extraction, chunking, embedding generation, ownerId filtering   |
+--------------------------------------------------------------------------+
| Phase 8.4: Backend — Semantic Search Service                             |
|  -- match_embeddings Postgres function, Express endpoint, scope filter   |
+--------------------------------------------------------------------------+
| Phase 8.5: Backend — Paper Summarization & Sidebar Suggestions           |
|  -- Summarize (short/detailed/method), auto-suggest sidebar fields,      |
|     AiSuggestion CRUD (accept/reject -> write or no-op)                  |
+--------------------------------------------------------------------------+
| Phase 8.6: Backend — Writing Assistance & Experiment Insight             |
|  -- Paraphrase, grammar, section outline, experiment interpretation,     |
|     isAiAssisted flag propagation                                        |
+--------------------------------------------------------------------------+
| Phase 8.7: Backend — Supervisor Progress Reports                         |
|  -- Project scope validation, data assembly, report generation, caching  |
+--------------------------------------------------------------------------+
| Phase 8.8: Backend — Quota, Blocked-Prompt & Admin Config APIs           |
|  -- AiQuota CRUD, AiProviderConfig CRUD, BlockedPromptRule CRUD,        |
|     usage/cost analytics                                                 |
+--------------------------------------------------------------------------+
| Phase 8.9: Frontend — AI Sidebar & Suggestion UX                         |
|  -- Summarize button in Paper viewer, suggestion cards, accept/reject UI |
+--------------------------------------------------------------------------+
| Phase 8.10: Frontend — Semantic Search UI                                |
|  -- Natural-language search panel, result cards, source attribution      |
+--------------------------------------------------------------------------+
| Phase 8.11: Frontend — Writing Assistance Integration                    |
|  -- Inline AI toolbar in ManuscriptEditorPage, AI-assisted section badge |
+--------------------------------------------------------------------------+
| Phase 8.12: Frontend — Admin AI Config Panel                             |
|  -- Provider selection, quota by role, blocked-prompt rule manager,      |
|     cost/usage analytics dashboard                                       |
+--------------------------------------------------------------------------+
| Phase 8.13: End-to-End Verification & Documentation Update               |
|  -- Multi-role E2E tests, access-boundary tests, acceptance criteria     |
+--------------------------------------------------------------------------+
```

### MVP Scope Prioritization

**Priority 1 — Core (must ship):**
- DB schema + pgvector `match_embeddings` function
- AI provider adapter (OpenAI minimum, Gemini optional)
- PDF embedding pipeline
- Semantic search (`POST /ai/search`)
- Paper summarization (`POST /ai/papers/:paperId/summarize`)
- Sidebar suggestions + AiSuggestion accept/reject
- Usage logging + monthly quota enforcement
- Admin provider config + quota management API

**Priority 2 (same module, after core works):**
- Writing assistance (paraphrase, grammar, outline)
- Experiment insight
- Supervisor progress summary
- Blocked-prompt rules management UI
- Admin cost analytics dashboard
- Frontend semantic search UI

**Out of scope for Module 08:**
- Real-time streaming AI responses
- BullMQ/Redis job queue
- Multi-modal AI (image analysis)
- Auto-tagging/taxonomy generation
- Plagiarism detection
- AI-generated citations

---

## Phase 8.1: Database Migration & Shared Contracts

**Goal:** Create the AI module schema as a single migration file with all tables, enums, indexes, the pgvector search function, and RLS policies.

### Migration File: `supabase/migrations/20261001000000_ai_assistant.sql`

#### New Postgres Enums

| Enum | Values |
| :--- | :--- |
| `embedding_source_type` | `'Paper'`, `'PaperSidebarFields'`, `'ManuscriptSection'` |
| `ai_suggestion_status` | `'Pending'`, `'Accepted'`, `'Rejected'` |
| `ai_suggestion_target_type` | `'PaperSidebarFields'`, `'ManuscriptSection'` |
| `ai_provider_enum` | `'OpenAI'`, `'Gemini'` |

#### Table 1: `embeddings`

```sql
create table if not exists public.embeddings (
  id           uuid primary key default gen_random_uuid(),
  source_type  embedding_source_type not null,
  source_id    uuid not null,
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  chunk_index  int not null default 0,
  vector       vector(768) not null,
  created_at   timestamptz not null default now()
);
create index if not exists idx_embeddings_owner on public.embeddings(owner_id);
create index if not exists idx_embeddings_source on public.embeddings(source_type, source_id);
```

**Ownership:** `owner_id`. Access filter must be applied server-side before any vector similarity search.

#### Table 2: `ai_suggestions`

```sql
create table if not exists public.ai_suggestions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  target_type      ai_suggestion_target_type not null,
  target_id        uuid not null,
  field_name       text not null,
  suggested_value  text not null,
  status           ai_suggestion_status not null default 'Pending',
  created_at       timestamptz not null default now()
);
create index if not exists idx_ai_suggestions_user on public.ai_suggestions(user_id);
create index if not exists idx_ai_suggestions_target on public.ai_suggestions(target_type, target_id);
```

**Ownership:** `user_id` derived from JWT. Nothing writes to the target row until `status = Accepted`.

#### Table 3: `ai_usage_logs`

```sql
create table if not exists public.ai_usage_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  feature      text not null,
  tokens_used  int not null default 0,
  cost_usd     numeric(10, 6),
  created_at   timestamptz not null default now()
);
create index if not exists idx_ai_usage_logs_user on public.ai_usage_logs(user_id);
create index if not exists idx_ai_usage_logs_created on public.ai_usage_logs(created_at);
```

#### Table 4: `ai_provider_configs`

```sql
create table if not exists public.ai_provider_configs (
  id           uuid primary key default gen_random_uuid(),
  provider     ai_provider_enum not null,
  api_key_ref  text not null,
  model        text not null,
  is_active    boolean not null default false,
  updated_by   uuid references public.profiles(id) on delete set null,
  updated_at   timestamptz not null default now()
);
-- Only one active provider at a time
create unique index if not exists idx_ai_provider_configs_active
  on public.ai_provider_configs(is_active)
  where is_active = true;
```

#### Table 5: `ai_quotas`

```sql
create table if not exists public.ai_quotas (
  role                 user_role primary key,
  monthly_token_limit  int not null default 100000
);
insert into public.ai_quotas (role, monthly_token_limit) values
  ('Admin', 0),
  ('Supervisor', 500000),
  ('Researcher', 100000)
on conflict (role) do nothing;
```

#### Table 6: `blocked_prompt_rules`

```sql
create table if not exists public.blocked_prompt_rules (
  id          uuid primary key default gen_random_uuid(),
  pattern     text not null,
  reason      text not null,
  created_by  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);
```

#### Table 7: `progress_reports`

```sql
create table if not exists public.progress_reports (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  student_id    uuid not null references public.profiles(id) on delete cascade,
  generated_by  uuid not null references public.profiles(id) on delete cascade,
  period_start  date not null,
  period_end    date not null,
  content       text not null,
  created_at    timestamptz not null default now()
);
create index if not exists idx_progress_reports_project on public.progress_reports(project_id);
create index if not exists idx_progress_reports_student on public.progress_reports(student_id);
```

#### pgvector Search Function

```sql
create or replace function public.match_embeddings(
  query_embedding  vector(768),
  owner_id_filter  uuid,
  top_k            int default 8,
  source_types     embedding_source_type[] default null
)
returns table (
  id          uuid,
  source_type embedding_source_type,
  source_id   uuid,
  chunk_index int,
  similarity  float
)
language plpgsql
as $$
begin
  return query
  select
    e.id,
    e.source_type,
    e.source_id,
    e.chunk_index,
    1 - (e.vector <=> query_embedding) as similarity
  from public.embeddings e
  where
    e.owner_id = owner_id_filter
    and (source_types is null or e.source_type = any(source_types))
  order by e.vector <=> query_embedding
  limit top_k;
end;
$$;
```

> **Security note:** `owner_id_filter` is always `req.userId` in Express. The frontend never calls `match_embeddings` directly.

#### RLS Policies

```sql
alter table public.embeddings enable row level security;
create policy "embeddings_select_own" on public.embeddings
  for select using (owner_id = auth.uid());

alter table public.ai_suggestions enable row level security;
create policy "ai_suggestions_select_own" on public.ai_suggestions
  for select using (user_id = auth.uid());

alter table public.ai_usage_logs enable row level security;
create policy "ai_usage_logs_select_own" on public.ai_usage_logs
  for select using (user_id = auth.uid());

-- Admin-only tables: no public read policies
alter table public.ai_provider_configs enable row level security;
alter table public.ai_quotas enable row level security;
alter table public.blocked_prompt_rules enable row level security;
alter table public.progress_reports enable row level security;
```

### Shared Types: `packages/shared-types/src/ai.ts`

Export all AI-related TypeScript types and enums for use in both frontend and backend:

```typescript
export type EmbeddingSourceType = 'Paper' | 'PaperSidebarFields' | 'ManuscriptSection';
export type AiSuggestionStatus = 'Pending' | 'Accepted' | 'Rejected';
export type AiSuggestionTargetType = 'PaperSidebarFields' | 'ManuscriptSection';
export type AiProviderEnum = 'OpenAI' | 'Gemini';

export interface AiSuggestion { id: string; userId: string; targetType: AiSuggestionTargetType; targetId: string; fieldName: string; suggestedValue: string; status: AiSuggestionStatus; createdAt: string; }
export interface AiUsageSummary { tokensUsedThisMonth: number; monthlyLimit: number; percentUsed: number; }
export interface SemanticSearchRequest { query: string; topK?: number; scope?: { projects?: string[] }; }
export interface SemanticSearchResult { sourceType: EmbeddingSourceType; sourceId: string; similarity: number; title?: string; snippet?: string; }
export interface SummarizeRequest { mode: 'short' | 'detailed' | 'method-focused'; }
export interface WritingAssistRequest { action: 'paraphrase' | 'grammar' | 'outline'; selectedText?: string; sectionType?: string; }
export interface AiProviderConfig { id: string; provider: AiProviderEnum; apiKeyRef: string; model: string; isActive: boolean; updatedAt: string; }
export interface AiQuota { role: string; monthlyTokenLimit: number; }
export interface BlockedPromptRule { id: string; pattern: string; reason: string; createdBy: string; createdAt: string; }
export interface ProgressReport { id: string; projectId: string; studentId: string; generatedBy: string; periodStart: string; periodEnd: string; content: string; createdAt: string; }
```

---

## Phase 8.2: Backend — AI Provider Adapter Layer

**Goal:** Create a provider-agnostic adapter that hides all provider-specific details from the rest of the application.

### Files to create

| File | Purpose |
| :--- | :--- |
| `apps/api/src/services/ai/aiProvider.interface.ts` | `AIProvider` interface + `TextOptions` type |
| `apps/api/src/services/ai/openai.provider.ts` | OpenAI implementation (chat completions + embeddings) |
| `apps/api/src/services/ai/gemini.provider.ts` | Gemini implementation (generateContent + embedContent) |
| `apps/api/src/services/ai/aiAdapter.ts` | Factory that reads `ai_provider_configs` and returns active provider |
| `apps/api/src/services/ai/blockedPrompt.service.ts` | Case-insensitive substring match against all `blocked_prompt_rules` |
| `apps/api/src/services/ai/quota.service.ts` | `enforceQuota()` + `logUsage()` |

#### Provider interface

```typescript
export interface TextOptions { maxTokens?: number; temperature?: number; systemPrompt?: string; }

export interface AIProvider {
  readonly name: string;
  generateText(prompt: string, options?: TextOptions): Promise<{ text: string; tokensUsed: number }>;
  generateEmbedding(text: string): Promise<number[]>;
  estimateTokens(text: string): number;
}
```

#### Quota enforcement (server-side always)

```typescript
export async function enforceQuota(userId: string, role: UserRole, estimatedTokens: number): Promise<void> {
  const { data: quota } = await supabaseAdmin.from('ai_quotas').select('monthly_token_limit').eq('role', role).single();
  const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
  const { data: usage } = await supabaseAdmin.from('ai_usage_logs').select('tokens_used').eq('user_id', userId).gte('created_at', startOfMonth.toISOString());
  const used = (usage ?? []).reduce((sum, r) => sum + r.tokens_used, 0);
  if (used + estimatedTokens > quota!.monthly_token_limit) {
    throw new Error('QUOTA_EXCEEDED');
  }
}
```

#### npm packages needed

| Package | Usage | Where |
| :--- | :--- | :--- |
| `openai` | OpenAI SDK | `apps/api` |
| `@google/generative-ai` | Gemini SDK | `apps/api` |
| `pdf-parse` | PDF text extraction | `apps/api` |

These must be added to `apps/api/package.json`. No frontend packages added.

---

## Phase 8.3: Backend — PDF Embedding Pipeline

**Goal:** Text extraction, chunking, embedding generation, and storage for Paper documents.

### File: `apps/api/src/services/ai/embedding.service.ts`

Key functions:
- `extractTextFromPdf(buffer: Buffer): Promise<string>` — uses `pdf-parse`
- `chunkText(text: string, maxChunkSize = 1000, overlap = 100): string[]` — paragraph-aware chunking
- `embedPaper(paperId, ownerId, pdfBuffer): Promise<void>` — full pipeline
- `deleteEmbeddingsForPaper(paperId): Promise<void>` — called before re-embedding

#### Integration in `paper.service.ts`

After paper creation succeeds, fire-and-forget:
```typescript
// Fetch the PDF buffer from Supabase Storage (via signed URL) then:
embedPaper(paper.id, req.userId, pdfBuffer).catch(err => {
  console.error('[AI] Embedding failed for paper', paper.id, err);
});
```

The paper creation response is returned immediately (no waiting).

### New Endpoint

| Method | Path | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| POST | `/ai/papers/:paperId/embed` | Paper owner | (Re)generate embeddings |

---

## Phase 8.4: Backend — Semantic Search Service

### File: `apps/api/src/services/ai/semanticSearch.service.ts`

```typescript
export async function semanticSearch(userId, userRole, query, topK = 8, requestedProjectScope?): Promise<SemanticSearchResult[]> {
  // 1. Resolve authorized scope (never trust client's project list directly)
  const authorizedProjectIds = await resolveAuthorizedProjectIds(userId, userRole, requestedProjectScope);

  // 2. Generate query embedding
  const provider = await getActiveProvider();
  const queryVector = await provider.generateEmbedding(query);

  // 3. Call pgvector function — scoped to owner only
  const { data: rawResults } = await supabaseAdmin.rpc('match_embeddings', {
    query_embedding: JSON.stringify(queryVector),
    owner_id_filter: userId,
    top_k: topK * 3,  // oversample then filter
  });

  // 4. Filter to authorized scope
  const filtered = filterResultsToAuthorizedScope(rawResults, authorizedProjectIds);

  // 5. Resolve source metadata (titles, snippets) and return top_k
  return resolveResultMetadata(filtered.slice(0, topK));
}
```

**Security:** `owner_id_filter` is always `req.userId`. Supervisor semantic search is over their own embeddings only — not students' data.

### Endpoint

| Method | Path | Roles | Purpose |
| :--- | :--- | :--- | :--- |
| POST | `/ai/search` | Researcher, Supervisor | Semantic search within authorized scope |

---

## Phase 8.5: Backend — Paper Summarization & Sidebar Suggestions

### File: `apps/api/src/services/ai/summarize.service.ts`

#### Summarization modes

| Mode | Max Tokens | System Prompt Focus |
| :--- | :--- | :--- |
| `short` | 200 | 3-sentence abstract-level summary |
| `detailed` | 1500 | Background, method, results, conclusion |
| `method-focused` | 1000 | In-depth methodology and experimental design |

#### Sidebar suggestion flow

1. Reconstruct paper text from embedding chunks (or fetch raw PDF again)
2. Build structured extraction prompt (JSON output: `researchGap`, `limitation`, `futureWork`, `methodology`)
3. Parse response → create 4 `AiSuggestion` rows (status = Pending)
4. Log usage

#### Suggestion accept/reject

| Operation | Side effect |
| :--- | :--- |
| Accept (PaperSidebarFields) | Updates `paper_sidebar_fields` field; sets `status = Accepted` |
| Accept (ManuscriptSection) | Updates `manuscript_sections.content`; sets `is_ai_assisted = true`; sets `status = Accepted` |
| Reject | Sets `status = Rejected`; no mutation to target field |
| Double-action | Returns 409 Conflict |

### Endpoints

| Method | Path | Roles | Purpose |
| :--- | :--- | :--- | :--- |
| POST | `/ai/papers/:paperId/summarize` | Researcher/Supervisor with paper access | Generate summary |
| POST | `/ai/papers/:paperId/sidebar-suggestions` | Researcher/Supervisor with paper access | Suggest structured fields |
| GET | `/ai/suggestions` | Owner | List own suggestions (filterable by targetType, status) |
| POST | `/ai/suggestions/:id/accept` | Suggestion owner | Apply suggestion to target field |
| POST | `/ai/suggestions/:id/reject` | Suggestion owner | Reject suggestion |

---

## Phase 8.6: Backend — Writing Assistance & Experiment Insight

### Writing Assistance

Actions and their behaviors:

| Action | Input | Output |
| :--- | :--- | :--- |
| `paraphrase` | Selected manuscript text | Rewritten version |
| `grammar` | Selected text | Grammar-corrected version |
| `outline` | Section type + optional context | Bullet-point outline |

All writing assist responses are returned as `AiSuggestion` rows (Pending), not applied automatically.

### Experiment Insight

Generates natural-language interpretation of an experiment's config + metrics. Access check mirrors `GET /experiments/:id`. Output is returned as plain text (no `AiSuggestion` row — insight is informational, not a field suggestion).

### Endpoints

| Method | Path | Roles | Purpose |
| :--- | :--- | :--- | :--- |
| POST | `/ai/manuscripts/:id/writing-assist` | Manuscript author/Supervisor | Writing assistance |
| POST | `/ai/experiments/:id/insight` | Experiment owner/Supervisor | Experiment interpretation |

---

## Phase 8.7: Backend — Supervisor Progress Reports

### Progress Summary Assembly

Data assembled per period (no Admin data, no private notes):

| Source | Fields Used |
| :--- | :--- |
| `tasks` | Title, status (Approved only), completion date |
| `experiments` | Name, purpose, status, metrics summary |
| `papers` | Title, reading status (Read/DeeplyAnalysed), year |

The assembled prompt NEVER includes `personalNotes` or any admin-only fields.

### Caching

If a `progress_report` row exists for the same `(project_id, student_id, period_start, period_end)` pair, return the cached version unless `?regenerate=true` is passed.

### Endpoint

| Method | Path | Roles | Purpose |
| :--- | :--- | :--- | :--- |
| POST | `/ai/projects/:projectId/progress-report` | Project Supervisor only | Generate student progress summary |

---

## Phase 8.8: Backend — Quota, Blocked-Prompt & Admin Config APIs

### File: `apps/api/src/routes/ai.routes.ts`

All research AI endpoints guarded by:
```typescript
authenticate, requireStatus('Active'), requireRole('Researcher', 'Supervisor')
```

### File: `apps/api/src/routes/adminAi.routes.ts`

All admin AI endpoints guarded by:
```typescript
authenticate, requireStatus('Active'), requireRole('Admin')
```

### Admin Endpoints

| Method | Path | Purpose |
| :--- | :--- | :--- |
| GET | `/admin/ai/config` | Read all provider configs |
| PATCH | `/admin/ai/config/:id` | Update provider/model/apiKeyRef; activate/deactivate |
| GET | `/admin/ai/quotas` | List role quotas |
| PATCH | `/admin/ai/quotas/:role` | Change role monthly token limit |
| GET | `/admin/ai/usage` | Global usage/cost analytics (aggregated, no PII content) |
| GET | `/admin/ai/blocked-rules` | List blocked-prompt rules |
| POST | `/admin/ai/blocked-rules` | Create rule |
| DELETE | `/admin/ai/blocked-rules/:id` | Remove rule |

### User Endpoint

| Method | Path | Purpose |
| :--- | :--- | :--- |
| GET | `/ai/usage` | Own usage summary (tokens used this month, limit, %) |

### Registration in `apps/api/src/index.ts`

```typescript
import { aiRouter } from './routes/ai.routes.js';
import { adminAiRouter } from './routes/adminAi.routes.js';

// Spec 08 API Route Mounts (AI Research Assistant)
app.use('/ai', aiRouter);
app.use('/admin/ai', adminAiRouter);
```

---

## Phase 8.9: Frontend — AI Sidebar & Suggestion UX

### New Components

| Component | Location | Purpose |
| :--- | :--- | :--- |
| `AiSummarizePanel.tsx` | `src/components/ai/` | Mode selector + summarize button + output card |
| `AiSuggestionCard.tsx` | `src/components/ai/` | Single suggestion with Accept/Reject actions |
| `AiSuggestionsPanel.tsx` | `src/components/ai/` | Trigger suggestions + list pending/acted suggestions |
| `AiUsageIndicator.tsx` | `src/components/ai/` | Token usage progress bar (used/limit) |

### AiSuggestionCard behavior

```
+--------------------------------------------------+
|  AI Suggestion — Research Gap                    |
|  "Prior work does not address temporal..."       |
|                                                  |
|  [Accept & Apply]   [Reject]                     |
+--------------------------------------------------+
```

- Accept -> POST `/ai/suggestions/:id/accept` -> update sidebar field in-place via React Query invalidation
- Reject -> POST `/ai/suggestions/:id/reject` -> card fades out

### Integration Points

- `PaperViewerPage.tsx` — add collapsible AI panel (right sidebar section)
- `LibraryPage.tsx` — "AI Suggest" quick-action per paper card

---

## Phase 8.10: Frontend — Semantic Search UI

### New Component: `src/components/ai/SemanticSearchPanel.tsx`

```
+--------------------------------------------------+
|  AI Semantic Search                              |
|  +--------------------------------------------+  |
|  | Which paper used a genomic dataset > 500...|  |
|  +--------------------------------------------+  |
|  [ Search ]   Project scope: [All] [Project A]   |
|                                                  |
|  Results:                                        |
|  +--------------------------------------------+  |
|  |  Smith et al. 2024 — NAS for Genomics      |  |
|  |  Similarity: 94%  *  Source: Paper          |  |
|  |  "...512 whole-genome samples..."           |  |
|  +--------------------------------------------+  |
+--------------------------------------------------+
```

### Integration Points

- `LibraryPage.tsx` — add "AI Search" tab
- `ResearcherWorkspacePage.tsx` — add search shortcut

---

## Phase 8.11: Frontend — Writing Assistance Integration

### AI Toolbar in `ManuscriptEditorPage.tsx`

Appears as a floating toolbar when text is selected in the editor:

```
[ Paraphrase ] [ Fix Grammar ] [ Suggest Outline ]
```

After calling writing assist, a suggestion diff panel appears:

```
+--------------------------------------------------+
|  AI Suggestion (Paraphrase)                      |
|  "The proposed method achieves..."               |
|                                                  |
|  [Replace Text]   [Dismiss]                      |
+--------------------------------------------------+
```

- "Replace Text" -> accepts suggestion -> section gets `isAiAssisted = true`
- Sections with `isAiAssisted = true` display a small robot icon in the section list
- Preview panel shows: `AI-assisted content — reviewed by author` on affected sections

---

## Phase 8.12: Frontend — Admin AI Config Panel

### Integration in `AdminConsolePage.tsx`

Add "AI Settings" tab with three sub-sections:

#### Provider Configuration

```
Active Provider:  [OpenAI v]
Model:            [gpt-4o v]
API Key Env Var:  [OPENAI_API_KEY]
                  [Save Config]
```

#### Quota Management

Table with role, monthly token limit, and edit action for Supervisor/Researcher rows.

#### Blocked Prompt Rules

Table with pattern, reason, created-by, delete action. Plus "Add Rule" button.

#### Usage Analytics

- Bar chart: tokens used this month by role
- Total estimated cost (USD)
- Top users by token consumption table

All data is aggregated — no raw research content is exposed.

---

## Phase 8.13: End-to-End Verification & Documentation Update

### Automated Tests: `apps/api/src/tests/ai-assistant.test.ts`

#### Security / Access-Boundary Tests

| Test | Expected |
| :--- | :--- |
| Researcher A semantic search cannot return Researcher B's embeddings | 200 empty results |
| Researcher summarizes paper they don't own | 403 |
| Non-owner accepts another user's suggestion | 403 |
| Researcher calls Admin config endpoint | 403 |
| Admin calls paper summarize endpoint | 403 |
| Quota-exceeded user calls AI feature | 429 |
| Blocked-prompt pattern match | 400 + AiUsageLog(tokensUsed=0) |
| Supervisor generates report for non-supervised project | 403 |

#### Happy-Path Tests

| Test | Expected |
| :--- | :--- |
| Paper summarization (all 3 modes) | 200 with `summary` string |
| Sidebar suggestions create Pending rows | 201 with `status: Pending` |
| Accept suggestion (sidebar) updates field | 200 + DB field updated |
| Accept suggestion (manuscript) sets isAiAssisted | 200 + DB flag true |
| Reject suggestion does not mutate field | 200 + field unchanged |
| Double-accept returns conflict | 409 |
| Semantic search returns owner-scoped results | 200 with `results[]` |
| Writing assist creates Pending suggestion | 201 Pending |
| Experiment insight returns text | 200 with `insight` |
| Supervisor progress report creates ProgressReport row | 200 with `content` |
| Usage log created after each AI call | DB row exists |
| Admin quota update is reflected in next quota check | 429 on lower limit |

### Manual E2E Verification Checklist

- [x] Server starts — warning logged if no active `ai_provider_configs` row
- [x] Admin configures provider in Admin Console AI Settings tab
- [x] Researcher uploads paper — background embedding completes (check server logs)
- [x] Researcher performs semantic search — results appear
- [x] Researcher summarizes paper (short mode) — summary renders
- [x] Researcher generates sidebar suggestions — cards appear; Accept writes to field
- [x] Researcher selects manuscript text, clicks Paraphrase — suggestion appears
- [x] Researcher accepts paraphrase — text replaced, AI badge shown
- [x] Supervisor generates progress report — content renders
- [x] Admin sets Researcher quota to 1 token — Researcher gets 429 on next AI call
- [x] Admin adds blocked-prompt rule "ignore all previous instructions" — Researcher query containing that phrase is blocked

### Documentation Updates

- [x] Update `WORKLOG.md` — add Milestone 7: AI Research Assistant (Module 08)
- [x] Update `docs/data-model.md` — confirm all 7 new AI tables are documented
- [x] Create `supabase/migrations/20261001000000_ai_assistant.sql`
- [x] Commit all new files to `development` branch before marking complete

---

## 17. Verification Plan & Test Cases

### Security Matrix

| Scenario | Role | Expected HTTP | DB Side Effect |
| :--- | :--- | :--- | :--- |
| Semantic search own papers | Researcher | 200 | None |
| Semantic search another user's papers | Researcher | 200 (empty, scoped) | None |
| Summarize unauthorized paper | Researcher | 403 | None |
| Accept suggestion owned by another user | Researcher | 403 | None |
| Call Admin AI config endpoint | Researcher | 403 | None |
| Exceed monthly quota | Researcher | 429 | None |
| Submit blocked prompt | Researcher | 400 | AiUsageLog tokensUsed=0 |
| Generate report for non-supervised project | Supervisor | 403 | None |
| Admin access research paper content via AI endpoint | Admin | 403 | None |

### Suggestion State Machine Tests

| Current Status | Action | Allowed | Result |
| :--- | :--- | :--- | :--- |
| Pending | Accept (owner) | Yes | Field updated; status=Accepted |
| Pending | Reject (owner) | Yes | No mutation; status=Rejected |
| Accepted | Accept again | No | 409 Conflict |
| Rejected | Accept | No | 409 Conflict |
| Pending | Accept (non-owner) | No | 403 |

---

## 18. Execution Progress & Activity Log

| Phase | Status | Notes |
|-------|--------|-------|
| 8.1 — DB Migration | Completed | Tables, enums, triggers, pgvector embedding migration committed |
| 8.2 — Provider Adapter | Completed | OpenAI, Anthropic, Gemini, Mock providers with dynamic config |
| 8.3 — Embedding Pipeline | Completed | pdf-parse, chunking, pgvector cosine similarity, auto-embed hook |
| 8.4 — Semantic Search | Completed | Scoped cosine distance search with project/user boundaries |
| 8.5 — Summarize & Suggestions | Completed | Multi-mode summarize (Quick, Comprehensive, Critique) & sidebar suggestions |
| 8.6 — Writing Assist & Experiment Insight | Completed | Paraphrase, grammar, section outline, experiment insights API |
| 8.7 — Supervisor Progress Reports | Completed | Scoped weekly progress reports for supervised projects |
| 8.8 — Admin Config APIs | Completed | Provider config, role quotas, blocked prompt policies, usage analytics |
| 8.9 — Frontend: AI Sidebar & Suggestions | Completed | AiUsageIndicator, AiSuggestionCard, AiSummarizePanel, AiSuggestionsPanel |
| 8.10 — Frontend: Semantic Search UI | Completed | SemanticSearchPanel with similarity scores and LibraryPage tab |
| 8.11 — Frontend: Writing Assistance | Completed | AI toolbar, contextual selection actions, diff modal, section badges & LaTeX preview transparency badges |
| 8.12 — Frontend: Admin AI Config Panel | Completed | AdminAiConfigPanel with Engine Settings, Role Quotas, Content Policies, and Usage Analytics |
| 8.13 — E2E Verification | Completed | 12/12 integration & contract tests passing (0 failures), 0 typecheck errors |

---

*Plan finalized: 2026-10-01. All 13 phases executed, tested, and verified.*
