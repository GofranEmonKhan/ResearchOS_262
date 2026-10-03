# Spec 08 — AI Research Assistant

## Goal

Implement Module 8 of `feature-plan.md` as a cross-cutting AI layer over Literature Manager, Experiment Tracker, and Writing & Review. The assistant supports PDF summarization, research-gap/limitation/future-work suggestions, semantic search across the user's accessible research data, citation-purpose suggestions, writing assistance, experiment insight, and Supervisor progress summaries. AI must never expand the user's access scope: retrieval is limited to data the user is already authorized to access. AI suggestions are human-reviewable and never silently overwrite structured research fields.

**Depends on:** Phases 1–5, especially `03-literature-manager.md`, `04-experiment-tracker.md`, `05-writing-review.md`, pgvector foundation

**Agent mode:** Plan mode, Review-driven autonomy. Provider integration, prompt policy, quota enforcement, data filtering, and cost tracking need explicit review.

## Architecture constraints

- Provider-agnostic adapter behind the application service layer.
- Supported providers in the feature plan: OpenAI and Gemini.
- AI provider API keys/configuration are Admin-only.
- Researcher/Supervisor AI operates only over resources already accessible through normal application authorization.
- AI suggestions are persisted separately from source fields.
- AI-assisted manuscript sections must carry the declared `isAiAssisted` flag.
- Token usage and estimated cost are logged.
- Monthly role-based quotas are enforced server-side.

## Entities & relations

### Embedding

```text
Embedding {
  id         uuid PK
  sourceType enum(Paper, PaperSidebarFields, ManuscriptSection)
  sourceId   uuid
  ownerId    FK→User
  chunkIndex int
  vector     vector(768)   -- fixed to 768 dimensions (Gemini text-embedding-004)
  createdAt  datetime
}
```

> **Resolution (Limitation 1 — vector dimension):** Dimension is fixed at **768** to match the Gemini `text-embedding-004` model, which is the active free-tier provider. If the provider is later changed to OpenAI (`text-embedding-3-small` = 1536-dim), a new migration must alter the column. Do not change this value without a matching migration.

Semantic search uses a Postgres function such as `match_embeddings` through Express.

### AiSuggestion

```text
AiSuggestion {
  id             uuid PK
  userId         FK→User         -- owner; derived from JWT, never client-supplied
  targetType     enum(PaperSidebarFields, ManuscriptSection)
  targetId       uuid
  fieldName      string
  suggestedValue string
  status         enum(Pending, Accepted, Rejected)
  createdAt      datetime
}
```

Nothing writes to the source field until an authorized human accepts the suggestion.

> **Resolution (Contradiction 1 — targetType):** `targetType` now includes `ManuscriptSection` to support writing-assistance suggestions (paraphrase, grammar, outline) that target `ManuscriptSection.content`, in addition to `PaperSidebarFields`. Both paths require human acceptance before any field mutation.
>
> **Resolution (Contradiction 2 — userId missing):** `userId` is a non-nullable FK to `profiles`. It is always set server-side from the verified JWT. The `GET /ai/suggestions` ownership filter uses this column. Clients cannot supply or override it.

### AiUsageLog

```text
AiUsageLog {
  id         uuid PK
  userId     FK→User
  feature    string
  tokensUsed int
  costUsd    decimal?
  createdAt  datetime
}
```

### AiProviderConfig

```text
AiProviderConfig {
  id        uuid PK
  provider  enum(OpenAI, Gemini)
  apiKeyRef string   -- name of the server env var holding the key, e.g. "GEMINI_API_KEY"
  model     string
  isActive  boolean  -- only one row may have isActive=true at any time
  updatedBy FK→User
  updatedAt datetime
}
```

Admin-only.

> **Resolution (Limitation 4 — apiKeyRef storage):** `apiKeyRef` stores the **name** of a server-side environment variable (e.g. `"GEMINI_API_KEY"`), not the raw API key. The Express backend resolves the actual key at call time via `process.env[apiKeyRef]`. The raw key is never written to the database. Admins set the env var name in the Admin console; the key itself is set in the server `.env` file.

### AiQuota

```text
AiQuota {
  role             enum(Admin, Supervisor, Researcher) PK
  monthlyTokenLimit int
}
```

Admin-only.

### BlockedPromptRule

```text
BlockedPromptRule {
  id        uuid PK
  pattern   string   -- plain string; evaluated as case-insensitive substring match
  reason    string
  createdBy FK→User
  createdAt datetime
}
```

> **Resolution (Limitation 3 — pattern type):** Patterns are plain strings matched via case-insensitive substring search (`prompt.toLowerCase().includes(pattern.toLowerCase())`). Regex is out of scope for v1 to avoid ReDoS risk. If regex support is added later, a `patternType` column must be added with explicit safety controls.

Admin-only.

### ProgressReport

```text
ProgressReport {
  id          uuid PK
  projectId   FK→Project
  studentId   FK→User
  generatedBy FK→User
  periodStart date
  periodEnd   date
  content     text
  createdAt   datetime
}
```

Intended for Supervisor progress summaries.

## AI access pipeline

```text
User request
   ↓
Authenticate
   ↓
Load live role/status
   ↓
Resolve normal application access scope
   ↓
Apply blocked-prompt/quota policy
   ↓
Retrieve only authorized sources
   ↓
Provider adapter
   ↓
Model response
   ↓
Usage log
   ↓
Suggestion/report/result
```

Never implement semantic search by querying all embeddings and filtering at the end in the browser.

## PDF / embedding pipeline

```text
PDF upload completes (Paper + FileAsset created)
 ↓
Express fires async background call (fire-and-forget)
 ↓
Text extraction (pdf-parse)
 ↓
Chunking (paragraph-aware, ~1000 chars, 100-char overlap)
 ↓
Embedding model (Gemini text-embedding-004 → 768-dim)
 ↓
Embedding rows (owner_id = uploader's userId)
 ↓
pgvector (match_embeddings Postgres function)
```

Store `owner_id` on every `Embedding` row so retrieval can always be filtered to the requesting user's authorized scope.

> **Resolution (Limitation 2 — async embedding):** The embedding pipeline runs **asynchronously** after the paper upload response is returned to the client. The upload endpoint returns `201 Created` immediately; embedding failures are logged server-side and do not fail the upload. A manual re-trigger endpoint `POST /ai/papers/:paperId/embed` is available. BullMQ/Redis is deferred unless synchronous embedding proves too slow at scale (see `build-plan.md`).

## AI features

### Paper summarization

Modes:

- short
- detailed
- method-focused

### Sidebar suggestion

Suggest:

- Research Gap
- Limitation
- Future Work
- Methodology
- other declared AI-supported fields

Suggestions are editable and remain Pending until accepted/rejected.

### Semantic search

Natural-language retrieval over accessible research material.

### Writing assistance

- paraphrase
- grammar
- section outline suggestion

### Experiment insight

Generate interpretation/insight from an experiment the user can already access.

### Supervisor progress summary

Generate from supervised project data including:

- approved tasks
- experiments run
- papers read

## API endpoints

> Proposed contract; provider-specific implementation must remain hidden behind the adapter.

| Method | Path | Roles | Purpose |
|---|---|---|---|
| POST | `/ai/papers/:paperId/summarize` | Researcher/Supervisor with paper access | Generate summary |
| POST | `/ai/papers/:paperId/sidebar-suggestions` | Researcher/Supervisor with paper access | Suggest structured fields |
| POST | `/ai/search` | Researcher/Supervisor | Semantic search within allowed scope |
| POST | `/ai/manuscripts/:id/writing-assist` | Authorized manuscript author/Supervisor | Writing assistance |
| POST | `/ai/experiments/:id/insight` | Experiment owner/Supervisor | Experiment insight |
| POST | `/ai/discover` | Researcher/Supervisor | Autonomous Perplexity-style scholarly discovery & synthesis |
| POST | `/ai/discover/import` | Researcher/Supervisor | 1-click import into project library & queue embedding |
| POST | `/ai/projects/:projectId/progress-report` | Project Supervisor | Student/project progress summary |
| GET | `/ai/suggestions` | Owner | List own suggestions |
| POST | `/ai/suggestions/:id/accept` | Suggestion owner | Apply suggestion to target field |
| POST | `/ai/suggestions/:id/reject` | Suggestion owner | Reject suggestion |
| GET | `/ai/usage` | Current user | Own usage summary |
| GET | `/admin/ai/config` | Admin | Read provider config |
| PATCH | `/admin/ai/config` | Admin | Update provider/model config |
| GET | `/admin/ai/quotas` | Admin | List quotas |
| PATCH | `/admin/ai/quotas/:role` | Admin | Change role quota |
| GET | `/admin/ai/usage` | Admin | Global AI usage/cost analytics |
| GET | `/admin/ai/blocked-rules` | Admin | List blocked-prompt rules |
| POST | `/admin/ai/blocked-rules` | Admin | Create rule |
| DELETE | `/admin/ai/blocked-rules/:id` | Admin | Remove rule |

### Semantic search request

```json
{
  "query": "Which paper used a corrosion dataset with more than 500 samples?",
  "topK": 8,
  "scope": {
    "projects": ["uuid"]
  }
}
```

The server must validate/derive the actual accessible scope rather than trusting the requested project list.

### Suggestion response

```json
{
  "data": {
    "id": "uuid",
    "fieldName": "researchGap",
    "suggestedValue": "Prior work does not evaluate...",
    "status": "Pending"
  }
}
```

## Role behavior

### Researcher

- Uses AI within quota.
- AI can access only their own library/notes/experiments and data explicitly shared into projects they can access.
- Can review and accept/reject AI sidebar suggestions.
- AI never silently overwrites research fields.

### Supervisor

- Same AI capabilities within accessible project data.
- Can generate supervised-student progress summaries.
- AI must not pull data from projects/students outside the Supervisor's legitimate access scope.

### Admin

- Does not use research AI as a research consumer.
- Configures provider/model.
- Manages API-key references.
- Sets monthly quota by role.
- Manages blocked-prompt policy.
- Views usage/cost analytics.

## Acceptance criteria

- [ ] AI provider implementation is behind a provider-agnostic adapter.
- [ ] Provider keys/config are never exposed to the frontend.
- [ ] A Researcher cannot retrieve embeddings/sources belonging to another user's private data.
- [ ] A Supervisor cannot retrieve project/student data outside their supervised access scope.
- [ ] Semantic search applies access filtering before final model context is assembled.
- [ ] Paper summaries are generated only for authorized papers.
- [ ] Sidebar suggestions are saved as `AiSuggestion` and start as `Pending`.
- [ ] Accepting a suggestion updates the target field only after explicit user action.
- [ ] Rejecting a suggestion does not mutate the source field.
- [ ] Manuscript AI assistance sets/maintains the `isAiAssisted` transparency flag where applicable.
- [ ] AI usage is logged with user, feature, token count, and cost where available.
- [ ] Monthly quota is enforced server-side.
- [ ] Blocked prompt rules are evaluated server-side.
- [ ] A user cannot alter their own quota through a client request.
- [ ] Admin can switch/configure the selected provider/model through the Admin API.
- [ ] Supervisor progress summaries are restricted to their own supervised project/student scope.
- [ ] Admin research-PII/content APIs remain unavailable merely because Admin can configure AI.
