# Implementation Plan — AI Literature Discovery & Review Engine

> **Document:** AI Literature Discovery & Review Engine Implementation Plan  
> **Location:** `docs/plans/ai-literature-discovery-plan.md`  
> **Status:** Ready for Review & Execution  
> **Reference Specs:** [docs/specs/08-ai-assistant.md](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/docs/specs/08-ai-assistant.md), [docs/specs/03-literature-manager.md](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/docs/specs/03-literature-manager.md), [docs/data-model.md](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/docs/data-model.md), [AGENTS.md](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/AGENTS.md)  
> **Dependencies:** Existing `OpenAlexProvider`, Gemini Provider Adapter (`gemini.provider.ts`), `paper.service.ts`, `embedding.service.ts`, Supabase Storage (`papers` bucket), `pgvector`  
> **Design Stack:** React + Vite + TypeScript, Tailwind CSS, Lucide icons, shadcn/ui design tokens, `ui-ux-pro-max`, `frontend-design`

---

## Table of Contents

1. [Executive Overview & Vision](#1-executive-overview--vision)
2. [Architectural Principles & Security Constraints](#2-architectural-principles--security-constraints)
3. [End-to-End Workflow Diagram](#3-end-to-end-workflow-diagram)
4. [Shared Data Contracts & Types](#4-shared-data-contracts--types)
5. [Sub-Feature Phasing Map](#5-sub-feature-phasing-map)
6. [Phase 1: Shared Contracts & Type Definitions](#phase-1-shared-contracts--type-definitions)
7. [Phase 2: Backend — OpenAlex Literature Query & Abstract Reconstruction](#phase-2-backend--openalex-literature-query--abstract-reconstruction)
8. [Phase 3: Backend — Perplexity-Style Gemini Synthesis Engine](#phase-3-backend--perplexity-style-gemini-synthesis-engine)
9. [Phase 4: Backend — Express Discovery & Ingestion Endpoints](#phase-4-backend--express-discovery--ingestion-endpoints)
10. [Phase 5: Backend — One-Click PDF Ingestion & Automatic Vectorization](#phase-5-backend--one-click-pdf-ingestion--automatic-vectorization)
11. [Phase 6: Frontend — API Client & State Hooks](#phase-6-frontend--api-client--state-hooks)
12. [Phase 7: Frontend — Industry-Grade UI Components](#phase-7-frontend--industry-grade-ui-components)
13. [Phase 8: Frontend — Library Tab Integration & Co-Pilot Access](#phase-8-frontend--library-tab-integration--co-pilot-access)
14. [Phase 9: End-to-End Verification & Automated Tests](#phase-9-end-to-end-verification--automated-tests)
15. [Acceptance Criteria Checklist](#15-acceptance-criteria-checklist)

---

## 1. Executive Overview & Vision

Currently, ResearchOS allows researchers to manage existing papers in their library and perform local semantic vector search over already-uploaded PDFs. 

The **AI Literature Discovery Engine** transforms ResearchOS into an **autonomous scholarly discovery platform** (comparable to Perplexity AI, Consensus, and Elicit):
- **Topic-Driven Scholarly Search**: Researchers enter a natural language topic or inquiry (e.g. *"Carbon-efficient LLM training algorithms"* or *"Spiking neural networks on low-power edge hardware"*).
- **Grounding in 250M+ Academic Works**: Queries OpenAlex for peer-reviewed papers with real DOIs, publication years, venues, citation counts, and open-access PDF links.
- **Perplexity-Style Literature Synthesis**: Gemini extracts core findings, identifies academic consensus, maps methodology landscapes, highlights unaddressed research gaps, and provides inline citations (`[1]`, `[2]`).
- **One-Click Ingestion & Auto-Embedding**: Researchers can immediately click **"Add to Project Library"**, downloading the paper/metadata into their project and scheduling automatic `pgvector` text chunking and embedding.

---

## 2. Architectural Principles & Security Constraints

Per [AGENTS.md](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/AGENTS.md):
1. **Ownership & Access Scope (AGENTS.md Section 5)**:
   - A user can only import papers into projects where they have legitimate access (either project owner or member of `project_members`).
   - Client-supplied `projectId` must be verified server-side against live database permissions.
2. **AI Quota & Prompt Moderation (Spec 08)**:
   - Topic inquiries are moderated via `checkPrompt(topic)` before API execution.
   - Monthly token quota is enforced via `checkQuota()` and logged via `logUsage()`.
3. **No Direct Frontend Secrets (AGENTS.md Section 8)**:
   - All external scholarly API calls (OpenAlex/CrossRef) and Gemini LLM calls occur strictly server-side in Node.js/Express.
4. **Resilient Vector Pipeline**:
   - Reuses the batch-embedding pipeline (`gemini-embedding-001` with 768 dimensions) so imported papers immediately become searchable locally.
5. **No Schema Changes Required**:
   - The feature reuses existing `papers`, `file_assets`, `embeddings`, `projects`, and `ai_usage_logs` tables.

---

## 3. End-to-End Workflow Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User as Researcher
    participant Web as React Web Client
    participant API as Express API (/ai/discover)
    participant AI as Gemini AI Adapter
    participant OpenAlex as OpenAlex Works API (250M+ Works)
    participant Storage as Supabase Storage (papers bucket)
    participant DB as Postgres (papers, file_assets, embeddings)
    participant Queue as Background Embed Pipeline

    User->>Web: Enters research topic / conversational inquiry
    Web->>API: POST /ai/discover { topic, limit, yearRange }
    API->>API: Authenticate JWT, checkQuota(), checkPrompt()
    API->>AI: Phase 2A: Query Planner (extracts canonical topic, academic domain, 2-3 keyword queries)
    AI-->>API: Returns { normalizedTopic, academicDomain, searchQueries }
    API->>OpenAlex: Phase 2B: Execute parallel multi-query search & reconstruct abstracts
    OpenAlex-->>API: Returns candidate papers (DOIs, authors, citations, OA URLs)
    opt When external APIs return 0 results
        API->>AI: Phase 2C: Grounded Scholarly Knowledge Retrieval (real seminal papers)
        AI-->>API: Returns verified seminal publications for niche topic
    end
    API->>AI: Phase 3: Synthesize literature review brief with inline citations [1] [2]
    AI-->>API: Returns structured synthesis (Consensus, Methods, Gaps, TL;DRs)
    API->>DB: Log token usage to ai_usage_logs
    API-->>Web: Returns LiteratureDiscoveryResponse (includes queryPlan + synthesis + papers)
    Web-->>User: Renders Perplexity search strategy + synthesis card + interactive papers

    User->>Web: Clicks "Add to Project" (selects Project X)
    Web->>API: POST /ai/discover/import { projectId, title, authors, doi, pdfUrl... }
    API->>DB: Verify user membership in Project X
    API->>Storage: Stream OA PDF or upload scholarly brief buffer
    Storage-->>API: Returns storage_path
    API->>DB: Insert file_assets and papers record
    API->>Queue: schedulePaperEmbedding(paperId)
    Queue-->>DB: Chunks and generates 768-dim embeddings in public.embeddings
    API-->>Web: 201 Created { paperId, message }
    Web-->>User: Badge updates to "In Project Library" with "Open Paper" link
```

---

## 4. Shared Data Contracts & Types

Added to `packages/shared-types/src/index.ts`:

```typescript
export interface DiscoveredPaper {
  id: string;              // OpenAlex work ID or DOI
  title: string;
  authors: string[];
  year: number | null;
  venue: string | null;
  doi: string | null;
  abstract: string | null;
  tldr: string | null;     // AI 1-line key takeaway
  citationCount: number;
  isOpenAccess: boolean;
  pdfUrl?: string | null;
  landingPageUrl?: string | null;
  isImported?: boolean;
}

export interface LiteratureDiscoveryRequest {
  topic: string;
  limit?: number;          // 5 to 15 (default 10)
  yearRange?: {
    from?: number;
    to?: number;
  };
}

export interface LiteratureDiscoveryQueryPlan {
  originalQuery: string;
  normalizedTopic: string;
  academicDomain: string;
  searchQueries: string[];
}

export interface LiteratureDiscoveryResponse {
  topic: string;
  queryPlan?: LiteratureDiscoveryQueryPlan;
  synthesis: {
    summary: string;
    consensus: string;
    keyThemes: Array<{
      title: string;
      description: string;
      paperIndices: number[]; // 1-based references [1], [2] matching paper list
    }>;
    researchGaps: string[];
  };
  papers: DiscoveredPaper[];
}

export interface ImportDiscoveredPaperDto {
  projectId: string;
  title: string;
  authors: string[];
  year?: number | null;
  venue?: string | null;
  doi?: string | null;
  abstract?: string | null;
  pdfUrl?: string | null;
}

export interface ImportDiscoveredPaperResponse {
  paperId: string;
  message: string;
}
```

---

## 5. Sub-Feature Phasing Map

| Phase | Component | Key Deliverable |
| :--- | :--- | :--- |
| **Phase 1** | Shared Contracts | Add DTOs + `LiteratureDiscoveryQueryPlan` in `packages/shared-types` |
| **Phase 2A** | AI Query Planner | Gemini query planner & natural language prompt decomposer into academic keyword queries |
| **Phase 2B** | OpenAlex Multi-Query Search | Execute parallel searches across generated keywords, reconstruct abstracts, deduplicate by DOI/title |
| **Phase 2C** | Grounded Scholarly Fallback | Retrieve verified seminal literature from grounded index if external APIs return 0 results |
| **Phase 3** | Perplexity Synthesis | Build literature review synthesis prompt with inline citations [1], [2], consensus, themes, and gaps |
| **Phase 4** | Express Routes | Create `POST /ai/discover` and `POST /ai/discover/import` |
| **Phase 5** | PDF Ingestion & Vectors | Stream open-access PDFs / briefs, call `createPaper`, trigger embedding |
| **Phase 6** | Frontend API Client | Add `api.discoverLiterature()` & `api.importDiscoveredPaper()` |
| **Phase 7** | Frontend UI Components | Build `LiteratureDiscoveryView` with Perplexity query plan chip sequence + synthesis card |
| **Phase 8** | Integration & UX | Add "AI Literature Discovery" tab in `LibraryPage.tsx` & Co-Pilot shortcut |
| **Phase 9** | Testing & Polish | Verify automated tests for conversational questions, end-to-end import flow, and quota tracking |

---

## 6. Phase 1: Shared Contracts & Type Definitions

- File: `packages/shared-types/src/index.ts`
- Export `DiscoveredPaper`, `LiteratureDiscoveryRequest`, `LiteratureDiscoveryQueryPlan`, `LiteratureDiscoveryResponse`, `ImportDiscoveredPaperDto`, `ImportDiscoveredPaperResponse`.
- Build package to ensure types are accessible across `@researchos/api` and `@researchos/web`.

---

## 7. Phase 2: AI Query Planning & Resilient Literature Retrieval

### Phase 2A: Gemini AI Query Planner & Decomposer
- Takes any conversational user input (e.g. *"Could you please give me some related paper of shared smartphone uses in HCI domain research?"*).
- Uses Gemini with strict JSON output:
  - `normalizedTopic`: Canonical scholarly topic title (e.g., *"Shared Smartphone Practices and Multi-User Device Interaction"*).
  - `academicDomain`: Subject discipline (e.g., *"Human-Computer Interaction (HCI)"*).
  - `searchQueries`: Array of 2–3 targeted academic keyword vectors optimized for scholarly bibliographic search (e.g., `["shared smartphone use HCI", "shared phone practices mobile privacy", "multi-user smartphone sharing"]`).

### Phase 2B: Parallel Multi-Query OpenAlex Search & Abstract Reconstruction
- File: `apps/api/src/services/metadata/openalex.provider.ts`
- OpenAlex stores abstracts as an inverted index (`abstract_inverted_index: { "word": [indices] }`).
- Implement `reconstructAbstract()` to turn inverted index into clean academic prose.
- Executes `searchDiscoveredWorks` across all decomposed query variations concurrently via `Promise.allSettled`.
- Merges results, deduplicates by DOI and normalized title, and sorts by citation count (`cited_by_count: desc`).

### Phase 2C: Grounded Scholarly Knowledge Fallback
- If OpenAlex returns 0 records (due to rate limits, network outages, or hyper-niche novel terminology):
  - Calls Gemini with an academic knowledge retrieval prompt to return verified, real-world peer-reviewed publications from reputable venues (e.g., ACM CHI, CSCW, UbiComp, IEEE Pervasive Computing, etc.).
  - Guarantees the researcher always receives rigorous, evidence-grounded papers instead of a dead-end error message.

---

## 8. Phase 3: Backend — Perplexity-Style Gemini Synthesis Engine

- File: `apps/api/src/services/ai/literatureDiscovery.service.ts`
- Formulates prompt instructing Gemini to act as an authoritative principal scholarly investigator:
  - Input: User research topic + transparent search plan + array of candidate papers with titles, authors, years, and abstracts.
  - Output: Strict JSON format containing:
    1. `summary`: 2–3 paragraph executive summary of the state of the art with inline numeric bracket citations `[1]`, `[2]`, `[3]`.
    2. `consensus`: Clear 1–2 sentence statement of where the scientific literature agrees.
    3. `keyThemes`: 3–4 dominant methodological or thematic trends, each referencing specific paper numbers `[1]`, `[2]`.
    4. `researchGaps`: 3–4 critical unanswered questions or limitations in current literature.
    5. `tldrs`: Mapping of 1-sentence TL;DR key takeaways for each paper.

---

## 9. Phase 4: Backend — Express Discovery & Ingestion Endpoints

- File: `apps/api/src/routes/ai.routes.ts`
- **Route 1: `POST /ai/discover`**:
  - Middleware: `authenticate`, `requireStatus('Active')`.
  - Moderation: `await checkPrompt(req.body.topic)`.
  - Quota: `await checkQuota(req.userId, req.userRole, 400)`.
  - Calls `literatureDiscoveryService.discoverLiterature(...)`.
  - Logs usage: `await logUsage({ userId, feature: 'literature_discovery', tokensUsed })`.
- **Route 2: `POST /ai/discover/import`**:
  - Middleware: `authenticate`, `requireStatus('Active')`.
  - Validates `projectId` against user authorization (must be project owner or member of `project_members`).
  - Calls `literatureDiscoveryService.importDiscoveredPaper(...)`.

---

## 10. Phase 5: Backend — One-Click PDF Ingestion & Automatic Vectorization

- File: `apps/api/src/services/ai/literatureDiscovery.service.ts`
- Ingestion flow:
  1. If `pdfUrl` is present (Open Access): fetch PDF bytes via `fetch(pdfUrl, { signal: AbortSignal.timeout(15000) })`.
  2. If paywalled or no PDF link: synthesize a structured academic brief (title, authors, abstract, venue, DOI, source link) and store as document.
  3. Upload bytes to Supabase Storage: `papers/${userId}/${Date.now()}_${safeTitle}.pdf`.
  4. Create `FileAsset` and `Paper` record assigned to `projectId` via `paperService.createPaper`.
  5. Asynchronously trigger `schedulePaperEmbedding()` to extract text and populate 768-dim embeddings in `public.embeddings`.
  6. Returns `{ paperId: newPaper.id, message: 'Paper imported into project library and queued for vector embedding.' }`.

---

## 11. Phase 6: Frontend — API Client & State Hooks

- File: `apps/web/src/lib/api.ts`
- Add API methods:
  - `api.discoverLiterature(topic, limit, yearRange): Promise<LiteratureDiscoveryResponse>`
  - `api.importDiscoveredPaper(dto: ImportDiscoveredPaperDto): Promise<ImportDiscoveredPaperResponse>`

---

## 12. Phase 7: Frontend — Industry-Grade UI Components

- Folder: `apps/web/src/components/ai/discovery/`
  1. `LiteratureDiscoveryView.tsx`: Main view containing search input, topic chips, loading skeletons, synthesis display, and paper cards.
  2. `DiscoverySynthesisCard.tsx`:
     - Dark glassmorphic card with gradient accent border.
     - Section for **Executive Summary** with clickable citation badges (`[1]`, `[2]`).
     - Section for **Consensus & State-of-the-Art**.
     - Accordion / chips for **Key Themes** and **Research Gaps**.
  3. `DiscoveredPaperCard.tsx`:
     - Number badge corresponding to citation indices (`#1`, `#2`).
     - Publication metadata: Authors, Year, Venue, Citation count badge (`🔥 142 citations`).
     - AI TL;DR Takeaway highlight box.
     - Collapsible abstract.
     - Action buttons: "Open Access PDF", "DOI Link", and **"Add to Project"** dropdown.

---

## 13. Phase 8: Frontend — Library Tab Integration & Co-Pilot Access

- File: `apps/web/src/pages/dashboards/LibraryPage.tsx`
- Add tab toggle to top navigation of Library:
  - `[All Papers] [AI Semantic Search] [✨ AI Literature Discovery]`
- Passes current user projects to `LiteratureDiscoveryView` so users can target any active project for 1-click import.
- When paper is imported, show toast feedback and update button to *"✓ In Project Library"* with a direct link to open the paper in the PDF reader.
- Add quick-trigger button in `AiCoPilotModal.tsx`: *"Explore Literature on Topic"*.

---

## 14. Phase 9: End-to-End Verification & Automated Tests

- File: `apps/api/src/tests/literature-discovery.test.ts`
- Automated test coverage:
  - OpenAlex abstract reconstruction unit test.
  - `POST /ai/discover` requires authentication (401).
  - `POST /ai/discover` blocked prompt rejection (400).
  - `POST /ai/discover` quota verification and usage logging.
  - `POST /ai/discover/import` rejects non-member project ID (403).
  - `POST /ai/discover/import` successfully creates paper and schedules embeddings.
- Full regression run: `pnpm test`.

---

## 15. Acceptance Criteria Checklist

- [ ] User can enter any research topic and receive 5–15 peer-reviewed paper recommendations.
- [ ] Papers include verified DOIs, publication years, venues, citation counts, and abstracts.
- [ ] AI generates a Perplexity-style synthesized overview with inline clickable citation badges (`[1]`, `[2]`).
- [ ] User can select a project and import any discovered paper with 1 click.
- [ ] Imported papers are saved to the project library with valid file assets in Supabase Storage.
- [ ] Background vector embedding is automatically triggered for newly imported papers.
- [ ] Imported papers immediately become searchable in local Semantic Search.
- [ ] Project authorization is strictly verified (cannot import into projects user doesn't belong to).
- [ ] Blocked prompt rules and monthly AI token quotas are enforced server-side.
- [ ] Design adheres to `ui-ux-pro-max` and `frontend-design` standards (responsive, dark-mode, high-readability).
