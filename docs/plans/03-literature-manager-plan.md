# Implementation Plan — Module 03: Literature Manager & Paper Management (Phased Execution)

> **Document:** Module 03 Implementation Plan
> **Location:** `docs/plans/03-literature-manager-plan.md`
> **Status:** Awaiting Approval (Revision 2 — incorporates all user review feedback)
> **Reference Specs:** [docs/specs/03-literature-manager.md](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/docs/specs/03-literature-manager.md), [docs/data-model.md](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/docs/data-model.md), [docs/feature-plan.md](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/docs/feature-plan.md), [AGENTS.md](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/AGENTS.md)
> **Depends on:** Spec 00 (Foundation), Spec 01 (Auth/RBAC), Spec 02 (Research Workspace)

---

## Table of Contents

1. [Core Architectural & Privacy Rules](#1-core-architectural--privacy-rules)
2. [Sub-Feature Phasing Map](#2-sub-feature-phasing-map)
3. [Phase 3.1: Database Migration & Shared Contracts](#phase-31-database-migration--shared-contracts)
4. [Phase 3.2: Backend — Supabase Storage & FileAsset Service](#phase-32-backend--supabase-storage--fileasset-service)
5. [Phase 3.3: Backend — Metadata Provider Architecture & DOI Pipeline](#phase-33-backend--metadata-provider-architecture--doi-pipeline)
6. [Phase 3.4: Backend — Paper CRUD, Sharing & Required Reading](#phase-34-backend--paper-crud-sharing--required-reading)
7. [Phase 3.5: Backend — Smart Research Sidebar, Annotations & Comments](#phase-35-backend--smart-research-sidebar-annotations--comments)
8. [Phase 3.6: Backend — Collections, Citation Purpose, Search & Export](#phase-36-backend--collections-citation-purpose-search--export)
9. [Phase 3.7: Frontend — Paper Library, Upload & Collection Management](#phase-37-frontend--paper-library-upload--collection-management)
10. [Phase 3.8: Frontend — PDF Viewer, Annotations & Smart Research Sidebar](#phase-38-frontend--pdf-viewer-annotations--smart-research-sidebar)
11. [Phase 3.9: End-to-End Verification & Documentation Update](#phase-39-end-to-end-verification--documentation-update)
12. [Verification Plan & Test Cases](#12-verification-plan--test-cases)
13. [Execution Progress & Activity Log](#execution-progress--activity-log)

---

## 1. Core Architectural & Privacy Rules

### Ownership Model

| Entity | Owner Column | Access Path |
| :--- | :--- | :--- |
| `Paper` | `uploader_id` | Uploader has full CRUD. If `project_id` is set, project members get read access. Supervisor reads structured sidebar fields (not Personal Notes unless explicitly shared). |
| `PaperSidebarFields` | (via `paper_id` → `Paper.uploader_id`) | Uploader only for writes. Supervisor reads structured fields if paper is in a shared project. `personal_notes` hidden unless `personal_notes_visible = true`. |
| `PaperAnnotation` | `user_id` | Annotation creator owns CRUD. All authorized project members can **see all annotations** on a shared paper (collaborative). Non-members see nothing. |
| `Collection` | `owner_id` | Owner-scoped. Only the creator can see, modify, or assign papers to a collection. |
| `PaperCollection` | (join table) | Access follows `Collection.owner_id`. |
| `CitationPurpose` | (via `paper_id` → `Paper.uploader_id`) | Uploader manages. |
| `PaperComment` | `author_id` | Only accessible when the paper is in a shared project library. Project members can read/write comments. |
| `FileAsset` | `owner_id` | Uploader owns. Referenced by `Paper.file_asset_id`. |

### Privacy Boundaries — The Three Critical Rules

1. **Personal Notes are private by default.** `PaperSidebarFields.personal_notes` is never returned to anyone except the uploader, **unless** `personal_notes_visible = true`. There is no implicit sharing — the Researcher must explicitly toggle the field.
2. **Admin cannot access paper content.** No Admin API endpoint returns paper bytes, sidebar content, annotations, or manuscript-level notes. Admin sees only aggregate metadata (storage usage, paper counts).
3. **Sharing is a conscious push.** A paper starts in the Researcher's personal library (`project_id IS NULL`). The Researcher explicitly pushes it to a shared project library via `POST /papers/:paperId/share`. Only then do project members gain read access.

### Annotations — Collaborative Visibility (v1)

Annotations are **collaborative** within a shared project scope:
- All authorized project members can see each other's annotations on shared papers.
- Non-members cannot see any annotations.
- No collaborator-level annotation permission system in v1.
- Authorization is enforced via both Express middleware **and** Supabase RLS policies.

### Reading Status — Bidirectional Changes

```
Unread <-> Reading <-> Read <-> DeeplyAnalysed
```

The reading status represents the Researcher's **current state**, not an irreversible workflow. Researchers may move in any direction (e.g., `Read → Reading` when revisiting a paper). The only validation is that the value must be a valid enum member.

### Storage Architecture

- PDFs are uploaded directly from the **frontend** to **Supabase Storage** using the publishable-key client (per AGENTS.md rule: Storage uploads are an allowed frontend Supabase operation).
- **Storage path convention:** `{userId}/{uuid}.pdf` — enforced and validated by the backend.
- The **Express backend** creates the `FileAsset` record and `Paper` record after the upload completes.
- If paper creation fails, the backend **deletes the orphaned Storage object** as part of rollback.
- PDF downloads use **signed URLs** generated server-side by Express (secret key), returned to authorized clients only.
- **Bucket name:** `papers` — a private bucket (no public access), created manually via Supabase Dashboard.
- The backend does **not** create or check the bucket on startup.

### Security — RLS as First-Class Layer & Option A Masking View

RLS is treated as **defense-in-depth** alongside Express middleware, not as a replacement. Both layers enforce the same access rules:
- Express middleware is the primary authorization gate for API endpoints.
- RLS policies provide a safety net at the database level.
- All business writes go through Express using the server secret key.
- **Option A Database Dynamic Masking View (`paper_sidebar_fields_view`):**
  PostgreSQL RLS provides row-level isolation. To guarantee that a Supervisor cannot read a student's private `personal_notes` even via direct SQL query on Supabase, the database provides `paper_sidebar_fields_view` with `security_invoker = true`. It dynamically masks `personal_notes` as `NULL` whenever the querying user is not the uploader and `personal_notes_visible = false`.

### Metadata Resolution & Confirmation Lifecycle

To prevent premature, half-formed, or orphan `Paper` records before metadata is confirmed:

```text
Step 1: User selects PDF in Frontend
           ↓
Step 2: Frontend uploads PDF directly to Supabase Storage:
        Bucket: 'papers', Path: '{userId}/{uuid}.pdf'
           ↓
Step 3: Frontend calls POST /metadata/resolve:
        Payload: { storagePath: '{userId}/{uuid}.pdf', fileName: 'paper.pdf' }
           ↓
Step 4: Backend downloads PDF, extracts text/DOI, queries CrossRef/OpenAlex,
        scores candidates, and returns:
        {
          status: 'resolved' | 'candidates' | 'manual',
          paper?: MetadataCandidate,
          candidates?: MetadataCandidate[]
        }
           ↓
Step 5: Frontend Upload Modal Review & Confirmation:
        • High confidence (≥0.85): Auto-selects and pre-fills form with best candidate.
          User STILL reviews, can edit fields, and confirms.
        • Medium confidence (0.50–0.84): Displays candidate list with scores. User picks
          one to pre-fill the form, or chooses manual entry.
        • Low/none (<0.50): Displays clean manual entry form.
           ↓
Step 6: User clicks "Save to Library" → Calls POST /papers:
        Payload: {
          title, authors, year, venue, doi,
          storagePath, fileName, mimeType, sizeBytes,
          metadataSource, metadataConfidence
        }
           ↓
Step 7: Backend atomically creates FileAsset + Paper in DB.
        If creation fails, rollback immediately deletes the uploaded Storage object!
```

Existing papers can refresh their metadata via `POST /papers/:paperId/metadata/refresh`, which returns candidates for the user to review and commit via `PATCH /papers/:paperId`. Metadata provenance (`metadata_source`, `metadata_confidence`) is tracked so the system knows where metadata originated.

---

## 2. Sub-Feature Phasing Map

```
+-----------------------------------------------------------------------------+
| Phase 3.1: Database Migration & Shared Contracts                            |
|  -- 8 tables, enums, indexes, constraints, RLS policies, shared DTOs        |
+-----------------------------------------------------------------------------+
| Phase 3.2: Backend — Supabase Storage & FileAsset Service                   |
|  -- Upload validation, signed URL generation, orphan cleanup, FileAsset CRUD|
+-----------------------------------------------------------------------------+
| Phase 3.3: Backend — Metadata Provider Architecture & DOI Pipeline          |
|  -- Pluggable provider interface, CrossRef + OpenAlex providers,            |
|     DOI extraction from PDF, fallback search, confidence scoring            |
+-----------------------------------------------------------------------------+
| Phase 3.4: Backend — Paper CRUD, Sharing & Required Reading                 |
|  -- Paper routes, duplicate detection, sharing, required reading            |
+-----------------------------------------------------------------------------+
| Phase 3.5: Backend — Smart Research Sidebar, Annotations & Comments         |
|  -- Sidebar CRUD, annotation CRUD with position data, privacy filter,       |
|     collaborative annotation visibility, paper comments                     |
+-----------------------------------------------------------------------------+
| Phase 3.6: Backend — Collections, Citation Purpose, Search & Export         |
|  -- Collections CRUD, citation purpose CRUD, metadata search, BibTeX/RIS    |
+-----------------------------------------------------------------------------+
| Phase 3.7: Frontend — Paper Library, Upload & Collection Management         |
|  -- Library views, upload modal with auto-metadata, collection sidebar      |
+-----------------------------------------------------------------------------+
| Phase 3.8: Frontend — PDF Viewer, Annotations & Smart Research Sidebar      |
|  -- In-browser PDF reader, highlight/sticky-note with position data,        |
|     collaborative annotation overlay, sidebar panel                         |
+-----------------------------------------------------------------------------+
| Phase 3.9: End-to-End Verification & Documentation Update                   |
|  -- Automated test suite, cross-role browser verification, WORKLOG.md       |
+-----------------------------------------------------------------------------+
```

### MVP Scope Prioritization

**Priority 1 — Core (must ship):**
- PDF upload with validation
- Automatic metadata extraction (DOI detection + CrossRef + OpenAlex fallback)
- Paper library (list, filter, sort)
- Paper metadata CRUD
- PDF viewer with `react-pdf`
- Annotations with persistent position data (collaborative)
- Smart Research Sidebar (6 structured fields + personal notes)
- Collections
- Citation purpose

**Priority 2 (ships in same module, but after core works):**
- Paper sharing to projects
- Required reading assignments
- Paper comments
- BibTeX export
- RIS export
- Metadata search

**Later modules (explicitly out of scope for Module 03):**
- AI metadata enrichment
- Semantic search (pgvector embeddings)
- Citation graph / knowledge graph
- Advanced recommendation
- Automatic literature synthesis
- Author normalization / disambiguation

---

## Phase 3.1: Database Migration & Shared Contracts

**Goal:** Establish the single source of truth for Module 03 schema, entities, enums, and API interfaces.

### 1. Migration: `supabase/migrations/20260903000000_literature_manager.sql`

#### New Postgres Enums

| Enum | Values |
| :--- | :--- |
| `reading_status` | `'Unread'`, `'Reading'`, `'Read'`, `'DeeplyAnalysed'` |
| `sidebar_field_type` | `'ResearchGap'`, `'Limitation'`, `'FutureWork'`, `'DatasetUsed'`, `'Methodology'`, `'Results'` |
| `citation_purpose_type` | `'Motivation'`, `'MethodSource'`, `'DatasetSource'`, `'ComparisonBaseline'`, `'ContradictingEvidence'`, `'SupportingEvidence'`, `'RelatedWork'` |
| `metadata_source` | `'crossref'`, `'openalex'`, `'pdf_extraction'`, `'user'` |

#### New Tables (8 total)

##### Table 1: `file_assets`
```sql
create table if not exists public.file_assets (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.profiles(id) on delete cascade,
  storage_path    text not null,          -- Supabase Storage path: {userId}/{uuid}.pdf
  file_name       text not null,
  mime_type       text not null,
  size_bytes      bigint not null default 0,
  uploaded_at     timestamptz not null default now()
);
create index if not exists idx_file_assets_owner on public.file_assets(owner_id);
```
- **Why a shared table:** `FileAsset` is referenced by 6+ modules (Paper, Experiment, Listing, Post, Verification, Transaction). Creating it now prevents per-module attachment tables.

##### Table 2: `papers`
```sql
create table if not exists public.papers (
  id                        uuid primary key default gen_random_uuid(),
  uploader_id               uuid not null references public.profiles(id) on delete cascade,
  project_id                uuid references public.projects(id) on delete set null,
  title                     text not null,
  authors                   text[] not null default '{}',
  year                      int,
  doi                       text unique,            -- nullable but unique when present (normalized)
  venue                     text,
  file_asset_id             uuid not null references public.file_assets(id) on delete cascade,
  reading_status            reading_status not null default 'Unread',
  is_required_reading       boolean not null default false,
  assigned_by_supervisor_id uuid references public.profiles(id) on delete set null,
  linked_task_id            uuid references public.tasks(id) on delete set null,
  -- Metadata provenance
  metadata_source           metadata_source not null default 'user',
  metadata_confidence       real not null default 1.0 check (metadata_confidence >= 0 and metadata_confidence <= 1),
  metadata_last_refreshed_at timestamptz,
  created_at                timestamptz not null default now()
);
create index if not exists idx_papers_uploader on public.papers(uploader_id);
create index if not exists idx_papers_project on public.papers(project_id);
create index if not exists idx_papers_reading_status on public.papers(reading_status);
-- Partial unique index: DOI uniqueness only when non-null
create unique index if not exists idx_papers_doi_unique
  on public.papers(doi) where doi is not null;
```
- **`on delete set null` for project_id:** If a project is deleted, paper remains in uploader's personal library.
- **`metadata_source`:** Tracks where metadata came from (`crossref`, `openalex`, `pdf_extraction`, `user`).
- **`metadata_confidence`:** Float 0.0–1.0 indicating confidence in the extracted metadata.
- **DOI normalization:** All DOIs are stored in normalized form (e.g., `10.1145/1234567`) — never with URL prefixes.

##### Table 3: `paper_sidebar_fields`
```sql
create table if not exists public.paper_sidebar_fields (
  id                       uuid primary key default gen_random_uuid(),
  paper_id                 uuid not null unique references public.papers(id) on delete cascade,
  research_gap             text,
  limitation               text,
  future_work              text,
  dataset_used             text,
  methodology              text,
  results                  text,
  personal_notes           text,
  personal_notes_visible   boolean not null default false
);
```
- **One-to-one with Paper** via `UNIQUE` constraint on `paper_id`.
- **Auto-creation:** A database trigger creates a blank `paper_sidebar_fields` row when a `Paper` is inserted.

##### Table 4: `paper_annotations`
```sql
create table if not exists public.paper_annotations (
  id                    uuid primary key default gen_random_uuid(),
  paper_id              uuid not null references public.papers(id) on delete cascade,
  user_id               uuid not null references public.profiles(id) on delete cascade,
  page                  int not null,
  highlighted_text      text not null,
  position_data         jsonb not null default '{}',    -- Zoom-invariant normalized coordinates { page, rects: [{x, y, width, height}] }
  sticky_note           text,
  linked_sidebar_field  sidebar_field_type,
  created_at            timestamptz not null default now()
);
create index if not exists idx_annotations_paper_user on public.paper_annotations(paper_id, user_id);
create index if not exists idx_annotations_paper on public.paper_annotations(paper_id);
```
- **`position_data` (JSONB):** Stores **scale-invariant normalized percentage coordinates** (0.0 to 1.0 relative to the rendered page width and height) or PDF points relative to the page `viewBox`. This ensures highlights remain pixel-perfect across zoom levels (`scale`), window resizing, and different device resolutions. Example structure:
```json
{
  "page": 5,
  "rects": [
    { "x": 0.152, "y": 0.324, "width": 0.625, "height": 0.021 }
  ]
}
```
`highlighted_text` is preserved for search/display, while `position_data` is used to project highlights dynamically onto the rendered page layer: `left: ${rect.x * 100}%`, `top: ${rect.y * 100}%`, `width: ${rect.width * 100}%`, `height: ${rect.height * 100}%`.

##### Table 5: `collections`
```sql
create table if not exists public.collections (
  id        uuid primary key default gen_random_uuid(),
  owner_id  uuid not null references public.profiles(id) on delete cascade,
  name      text not null,
  color_hex text not null default '#6366f1'
);
create index if not exists idx_collections_owner on public.collections(owner_id);
```

##### Table 6: `paper_collections` (join table)
```sql
create table if not exists public.paper_collections (
  paper_id      uuid not null references public.papers(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  primary key (paper_id, collection_id)
);
```

##### Table 7: `citation_purposes`
```sql
create table if not exists public.citation_purposes (
  id             uuid primary key default gen_random_uuid(),
  paper_id       uuid not null references public.papers(id) on delete cascade,
  manuscript_id  uuid,              -- FK to Manuscript added in Module 05 migration
  purpose        citation_purpose_type not null,
  note           text
);
create index if not exists idx_citation_purposes_paper on public.citation_purposes(paper_id);
```
- **Note:** `manuscript_id` is untyped for now (no FK constraint) since the `manuscripts` table does not exist until Module 05. When Module 05 migration runs, an `ALTER TABLE` will add the FK constraint.

##### Table 8: `paper_comments`
```sql
create table if not exists public.paper_comments (
  id          uuid primary key default gen_random_uuid(),
  paper_id    uuid not null references public.papers(id) on delete cascade,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_paper_comments_paper on public.paper_comments(paper_id);
```

#### Database Trigger: Auto-create Sidebar Fields Row

```sql
create or replace function handle_new_paper()
returns trigger as $$
begin
  insert into public.paper_sidebar_fields (paper_id)
  values (NEW.id);
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_paper_created
  after insert on public.papers
  for each row
  execute function handle_new_paper();
```

#### Metadata Search Support

> **Note:** This is **paper metadata search** (title, venue, authors), not full-text search of PDF content. Full PDF content search is out of scope for Module 03.

```sql
alter table public.papers
  add column if not exists search_vector tsvector;

create or replace function public.handle_papers_search_vector()
returns trigger
language plpgsql
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.venue, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(new.authors, ' '), '')), 'C');
  return new;
end;
$$;

drop trigger if exists on_papers_search_vector_update on public.papers;
create trigger on_papers_search_vector_update
  before insert or update on public.papers
  for each row
  execute function public.handle_papers_search_vector();

create index if not exists idx_papers_search_vector
  on public.papers using gin (search_vector);
```

#### RLS Policies (Defense-in-Depth)

Enable RLS on all 8 tables. All business writes go through Express (secret key, bypasses RLS). These SELECT/UPDATE policies provide defense-in-depth for any Realtime subscriptions or accidental direct queries.

```sql
-- Enable RLS on all Module 03 tables
alter table public.file_assets enable row level security;
alter table public.papers enable row level security;
alter table public.paper_sidebar_fields enable row level security;
alter table public.paper_annotations enable row level security;
alter table public.collections enable row level security;
alter table public.paper_collections enable row level security;
alter table public.citation_purposes enable row level security;
alter table public.paper_comments enable row level security;

-- file_assets: owner can read their own files
create policy "File assets viewable by owner"
  on public.file_assets for select to authenticated
  using (owner_id = auth.uid());

-- papers: uploader can see own papers; project members can see shared papers
create policy "Papers viewable by uploader or project members"
  on public.papers for select to authenticated
  using (
    uploader_id = auth.uid()
    or (
      project_id is not null and (
        exists (
          select 1 from public.projects p
          where p.id = papers.project_id and p.owner_id = auth.uid()
        )
        or exists (
          select 1 from public.project_members pm
          where pm.project_id = papers.project_id and pm.user_id = auth.uid()
        )
      )
    )
  );

-- paper_sidebar_fields: accessible if user can access the parent paper
create policy "Sidebar fields viewable by paper viewers"
  on public.paper_sidebar_fields for select to authenticated
  using (
    exists (
      select 1 from public.papers p
      where p.id = paper_sidebar_fields.paper_id
        and (
          p.uploader_id = auth.uid()
          or (
            p.project_id is not null and (
              exists (select 1 from public.projects pr where pr.id = p.project_id and pr.owner_id = auth.uid())
              or exists (select 1 from public.project_members pm where pm.project_id = p.project_id and pm.user_id = auth.uid())
            )
          )
        )
    )
  );

-- Option A: Dynamic Column Masking View (ensures hidden personal notes are NEVER exposed even via direct Supabase queries)
create or replace view public.paper_sidebar_fields_view
with (security_invoker = true) as
select
  id,
  paper_id,
  research_gap,
  limitation,
  future_work,
  dataset_used,
  methodology,
  results,
  personal_notes_visible,
  case
    when exists (
      select 1 from public.papers p
      where p.id = paper_sidebar_fields.paper_id
        and p.uploader_id = auth.uid()
    ) then personal_notes
    when personal_notes_visible then personal_notes
    else null
  end as personal_notes
from public.paper_sidebar_fields;

-- paper_annotations: collaborative — all project members see all annotations
-- For personal (unshared) papers, only the annotation creator sees their annotations
create policy "Annotations viewable by authorized paper viewers"
  on public.paper_annotations for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.papers p
      where p.id = paper_annotations.paper_id
        and p.project_id is not null
        and (
          p.uploader_id = auth.uid()
          or exists (select 1 from public.projects pr where pr.id = p.project_id and pr.owner_id = auth.uid())
          or exists (select 1 from public.project_members pm where pm.project_id = p.project_id and pm.user_id = auth.uid())
        )
    )
  );

-- collections: owner-scoped
create policy "Collections viewable by owner"
  on public.collections for select to authenticated
  using (owner_id = auth.uid());

-- paper_collections: accessible if user owns the collection
create policy "Paper-collection links viewable by collection owner"
  on public.paper_collections for select to authenticated
  using (
    exists (
      select 1 from public.collections c
      where c.id = paper_collections.collection_id and c.owner_id = auth.uid()
    )
  );

-- citation_purposes: accessible if user can access the parent paper
create policy "Citation purposes viewable by paper viewers"
  on public.citation_purposes for select to authenticated
  using (
    exists (
      select 1 from public.papers p
      where p.id = citation_purposes.paper_id
        and (
          p.uploader_id = auth.uid()
          or (
            p.project_id is not null and (
              exists (select 1 from public.projects pr where pr.id = p.project_id and pr.owner_id = auth.uid())
              or exists (select 1 from public.project_members pm where pm.project_id = p.project_id and pm.user_id = auth.uid())
            )
          )
        )
    )
  );

-- paper_comments: accessible when paper is in a shared project and user is a member
create policy "Paper comments viewable by shared-project members"
  on public.paper_comments for select to authenticated
  using (
    exists (
      select 1 from public.papers p
      where p.id = paper_comments.paper_id
        and p.project_id is not null
        and (
          p.uploader_id = auth.uid()
          or exists (select 1 from public.projects pr where pr.id = p.project_id and pr.owner_id = auth.uid())
          or exists (select 1 from public.project_members pm where pm.project_id = p.project_id and pm.user_id = auth.uid())
        )
    )
  );
```

### 2. Shared Types: `packages/shared-types/src/index.ts`

Add the following types and enums to the existing shared types package:

#### New Enums

```typescript
// ==========================================
// 6. Literature Manager Enums (Spec 03)
// ==========================================

export type ReadingStatus = 'Unread' | 'Reading' | 'Read' | 'DeeplyAnalysed';

export const READING_STATUSES: Record<ReadingStatus, ReadingStatus> = {
  Unread: 'Unread',
  Reading: 'Reading',
  Read: 'Read',
  DeeplyAnalysed: 'DeeplyAnalysed',
};

export type SidebarFieldType =
  | 'ResearchGap' | 'Limitation' | 'FutureWork'
  | 'DatasetUsed' | 'Methodology' | 'Results';

export const SIDEBAR_FIELD_TYPES: Record<SidebarFieldType, SidebarFieldType> = {
  ResearchGap: 'ResearchGap',
  Limitation: 'Limitation',
  FutureWork: 'FutureWork',
  DatasetUsed: 'DatasetUsed',
  Methodology: 'Methodology',
  Results: 'Results',
};

export type CitationPurposeType =
  | 'Motivation' | 'MethodSource' | 'DatasetSource'
  | 'ComparisonBaseline' | 'ContradictingEvidence'
  | 'SupportingEvidence' | 'RelatedWork';

export const CITATION_PURPOSE_TYPES: Record<CitationPurposeType, CitationPurposeType> = {
  Motivation: 'Motivation',
  MethodSource: 'MethodSource',
  DatasetSource: 'DatasetSource',
  ComparisonBaseline: 'ComparisonBaseline',
  ContradictingEvidence: 'ContradictingEvidence',
  SupportingEvidence: 'SupportingEvidence',
  RelatedWork: 'RelatedWork',
};

export type MetadataSource = 'crossref' | 'openalex' | 'pdf_extraction' | 'user';

export const METADATA_SOURCES: Record<MetadataSource, MetadataSource> = {
  crossref: 'crossref',
  openalex: 'openalex',
  pdf_extraction: 'pdf_extraction',
  user: 'user',
};
```

#### New Entity Interfaces

```typescript
export interface FileAsset {
  id: string;
  ownerId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface Paper {
  id: string;
  uploaderId: string;
  projectId?: string | null;
  title: string;
  authors: string[];
  year?: number | null;
  doi?: string | null;
  venue?: string | null;
  fileAssetId: string;
  readingStatus: ReadingStatus;
  isRequiredReading: boolean;
  assignedBySupervisorId?: string | null;
  linkedTaskId?: string | null;
  metadataSource: MetadataSource;
  metadataConfidence: number;
  metadataLastRefreshedAt?: string | null;
  createdAt: string;
  // Joined fields for UI
  uploader?: Partial<Profile> | null;
  fileAsset?: Partial<FileAsset> | null;
  collections?: Collection[];
}

export interface PaperSidebarFields {
  id: string;
  paperId: string;
  researchGap?: string | null;
  limitation?: string | null;
  futureWork?: string | null;
  datasetUsed?: string | null;
  methodology?: string | null;
  results?: string | null;
  personalNotes?: string | null;
  personalNotesVisible: boolean;
}

// Position data structure for zoom-invariant persistent annotation rendering
export interface AnnotationRect {
  x: number;          // normalized percentage 0.0–1.0 relative to page width
  y: number;          // normalized percentage 0.0–1.0 relative to page height
  width: number;      // normalized percentage 0.0–1.0
  height: number;     // normalized percentage 0.0–1.0
}

export interface AnnotationPositionData {
  page: number;
  rects: AnnotationRect[];
}

export interface PaperAnnotation {
  id: string;
  paperId: string;
  userId: string;
  page: number;
  highlightedText: string;
  positionData: AnnotationPositionData;
  stickyNote?: string | null;
  linkedSidebarField?: SidebarFieldType | null;
  createdAt: string;
  user?: Partial<Profile> | null;
}

export interface Collection {
  id: string;
  ownerId: string;
  name: string;
  colorHex: string;
  paperCount?: number;
}

export interface CitationPurpose {
  id: string;
  paperId: string;
  manuscriptId?: string | null;
  purpose: CitationPurposeType;
  note?: string | null;
}

export interface PaperComment {
  id: string;
  paperId: string;
  authorId: string;
  body: string;
  createdAt: string;
  author?: Partial<Profile> | null;
}

// Metadata candidate returned by provider search
export interface MetadataCandidate {
  title: string;
  authors: string[];
  year?: number | null;
  doi?: string | null;
  venue?: string | null;
  source: MetadataSource;
  confidence: number;     // 0.0–1.0
}

export interface MetadataResult {
  status: 'resolved' | 'candidates' | 'manual';
  paper?: MetadataCandidate;
  candidates?: MetadataCandidate[];
}

// DTOs
export interface ResolveMetadataDto {
  storagePath: string;    // {userId}/{uuid}.pdf
  fileName: string;
}

export interface CreatePaperDto {
  title: string;
  authors: string[];
  year?: number | null;
  doi?: string | null;
  venue?: string | null;
  storagePath: string;    // from frontend Supabase Storage upload: {userId}/{uuid}.pdf
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  metadataSource?: MetadataSource;
  metadataConfidence?: number;
}

export interface UpdatePaperDto {
  title?: string;
  authors?: string[];
  year?: number | null;
  doi?: string | null;
  venue?: string | null;
  readingStatus?: ReadingStatus;  // bidirectional — any valid enum value
}

export interface SharePaperDto {
  projectId: string;
}

export interface RequiredReadingDto {
  linkedTaskId?: string | null;
}

export interface UpdateSidebarFieldsDto {
  researchGap?: string | null;
  limitation?: string | null;
  futureWork?: string | null;
  datasetUsed?: string | null;
  methodology?: string | null;
  results?: string | null;
  personalNotes?: string | null;
  personalNotesVisible?: boolean;
}

export interface CreateAnnotationDto {
  page: number;
  highlightedText: string;
  positionData: AnnotationPositionData;   // required for persistent rendering
  stickyNote?: string | null;
  linkedSidebarField?: SidebarFieldType | null;
}

export interface UpdateAnnotationDto {
  stickyNote?: string | null;
  linkedSidebarField?: SidebarFieldType | null;
}

export interface CreateCollectionDto {
  name: string;
  colorHex?: string;
}

export interface UpdateCollectionDto {
  name?: string;
  colorHex?: string;
}

export interface CreateCitationPurposeDto {
  paperId: string;
  manuscriptId?: string | null;
  purpose: CitationPurposeType;
  note?: string | null;
}

export interface AddPaperCommentDto {
  body: string;
}

export interface PaperSearchParams {
  q?: string;             // Metadata search query (title, authors, venue)
  projectId?: string;     // Filter to project library
  collectionId?: string;  // Filter to collection
  readingStatus?: ReadingStatus;
  year?: number;
  isRequiredReading?: boolean;
  page?: number;
  limit?: number;
}
```

---

## Phase 3.2: Backend — Supabase Storage & FileAsset Service

**Goal:** Establish the PDF storage infrastructure with controlled paths, validation, and orphan cleanup.

### 1. Supabase Storage Bucket Setup

> **Review-driven autonomy required** — Storage access configuration is security-sensitive.

- **Bucket name:** `papers`
- **Public:** `false` (private bucket — all access via signed URLs)
- **File size limit:** 50MB
- **Allowed MIME types:** `application/pdf`
- **Creation method:** Manually via Supabase Dashboard. The backend does **not** create or check the bucket on startup. This keeps storage infrastructure configuration separate from application runtime logic.

### 2. Standardized Object Path Convention

- **Bucket Name:** `papers`
- **Object Path inside bucket:** `{userId}/{uuid}.pdf`

Frontend upload call:
```typescript
supabase.storage.from('papers').upload(`${userId}/${uuid}.pdf`, file)
```

The backend strictly validates that:
1. The `storagePath` matches the regex `/^[a-f0-9-]+\/[a-f0-9-]+\.pdf$/i`.
2. The path prefix matches `req.userId` (user owns the uploaded object).
3. The file exists in the `papers` bucket.
4. The MIME type is `application/pdf`.
5. The file size is within limits (≤50MB).

The backend does **not** blindly trust an arbitrary `storagePath` from the client.

### 3. PDF Upload Validation

The backend validates every upload:

| Check | Enforcement Point |
| :--- | :--- |
| File extension `.pdf` | Frontend pre-check + backend validation of storage path |
| MIME type `application/pdf` | Supabase bucket config + backend validation of `mimeType` field |
| File size ≤ 50MB | Supabase bucket config + backend validation of `sizeBytes` field |
| Path ownership (`{userId}/...`) | Backend validation against authenticated user |
| Empty/corrupt file | Backend checks `sizeBytes > 0`; advanced corruption detection deferred to later |

### 4. Upload Rollback / Orphan Cleanup

If `POST /papers` fails after the frontend has already uploaded the PDF to Storage:

```
Frontend uploads PDF → success
      |
      v
POST /papers → attempt to create FileAsset + Paper
      |
      v
Success?
  +-- YES --> keep file, return Paper
  +-- NO  --> delete uploaded Storage object via
              supabaseAdmin.storage.from('papers').remove([storagePath])
              Return error to client
```

The cleanup is performed in a `try/catch` block within the `createPaper` service method. If the cleanup itself fails, log the error — the orphaned file is a known edge case that can be handled by a periodic cleanup job later.

### 5. New Files

#### [NEW] `apps/api/src/services/fileAsset.service.ts`

| Method | Purpose |
| :--- | :--- |
| `createFileAsset(ownerId, storagePath, fileName, mimeType, sizeBytes)` | Validates path ownership and parameters. Inserts `file_assets` row. |
| `getSignedUrl(fileAssetId, requesterId)` | Verifies authorized access (via paper → project membership check). Generates 1-hour signed URL via `supabaseAdmin.storage.from('papers').createSignedUrl(...)`. |
| `deleteFileAsset(fileAssetId)` | Deletes the Storage object **and** the DB row. Called when a Paper is deleted. |
| `deleteStorageObject(storagePath)` | Deletes only the Storage object. Used for orphan cleanup on failed paper creation. |

### 6. Signed URL Endpoint

| Method | Path | Roles | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/papers/:paperId/download-url` | Authorized viewer | Returns a time-limited signed URL for the PDF |

Authorization:
- Uploader: always allowed.
- Project member (if `paper.project_id` is set): allowed.
- Admin: **denied** (Admin cannot access paper content).

---

## Phase 3.3: Backend — Metadata Provider Architecture & DOI Pipeline

**Goal:** Pluggable metadata extraction with automatic DOI detection from PDFs, CrossRef/OpenAlex lookup, fallback search with confidence scoring, and user confirmation for uncertain metadata.

### 1. Provider Abstraction

#### [NEW] `apps/api/src/metadata/metadata-provider.ts`

```typescript
// Provider interface — all providers implement this
export interface MetadataProvider {
  name: MetadataSource;
  lookupByDoi(doi: string): Promise<MetadataCandidate | null>;
  searchByQuery(query: { title?: string; authors?: string[] }): Promise<MetadataCandidate[]>;
}
```

#### [NEW] `apps/api/src/metadata/crossref.provider.ts`

```typescript
// CrossRef implementation
// - lookupByDoi: GET https://api.crossref.org/works/{encodedDoi}
// - searchByQuery: GET https://api.crossref.org/works?query.title=...&query.author=...
// - Uses built-in fetch() — no new npm dependency
// - Includes CROSSREF_MAILTO env var in User-Agent for polite pool
// - Parses: message.title[0], message.author[].given+family,
//   message.published-print.date-parts[0][0] (year), message.container-title[0] (venue)
```

#### [NEW] `apps/api/src/metadata/openalex.provider.ts`

```typescript
// OpenAlex implementation
// - lookupByDoi: GET https://api.openalex.org/works/doi:{doi}
// - searchByQuery: GET https://api.openalex.org/works?search={title}&filter=...
// - Uses built-in fetch() — no new npm dependency
// - Parses: title, authorships[].author.display_name,
//   publication_year, primary_location.source.display_name (venue)
```

#### [NEW] `apps/api/src/metadata/metadata.service.ts`

The orchestrator that coordinates providers:

```typescript
// MetadataService responsibilities:
//
// 1. extractDoiFromText(pdfText: string): string | null
//    - Regex-based DOI detection in PDF text
//    - Normalizes DOI (strips https://doi.org/, http://dx.doi.org/, doi: prefixes)
//    - Validates DOI format (must start with 10.{registrant}/{suffix})
//
// 2. identifyPaper(storagePath: string): Promise<MetadataResult>
//    - Downloads PDF from Storage (server-side via admin client)
//    - Extracts first ~3 pages of text (Node.js PDF text extraction)
//    - Attempts DOI extraction from text
//    - If DOI found: CrossRef lookup → normalize → return high-confidence result
//    - If no DOI: extract likely title+authors from first-page text
//    -   → search OpenAlex, then CrossRef as fallback
//    -   → rank candidates by similarity
//    -   → return candidates with confidence scores
//
// 3. normalizeDoi(rawDoi: string): string
//    - Strips URL prefixes, whitespace, trailing punctuation
//    - Lowercase for consistency
//    - Validates format
//
// 4. scoreCandidate(extracted: {title, authors}, candidate: MetadataCandidate): number
//    - Title similarity (Levenshtein or token-based)
//    - Author overlap
//    - Returns confidence 0.0–1.0
```

**MetadataResult return type:**

```typescript
interface MetadataResult {
  status: 'resolved' | 'candidates' | 'manual';
  // 'resolved': high-confidence single match
  // 'candidates': multiple candidates for user confirmation
  // 'manual': no matches found, user must enter metadata manually
  paper?: MetadataCandidate;       // when status === 'resolved'
  candidates?: MetadataCandidate[]; // when status === 'candidates'
}
```

### 2. DOI Extraction from PDF

When a researcher uploads a PDF, the backend:

1. Downloads the PDF from Supabase Storage (using the admin client).
2. Extracts text from the first ~3 pages using a lightweight PDF text extraction approach.
3. Searches for DOI patterns via regex: `/\b(10\.\d{4,9}\/[^\s]+)/gi`.
4. Normalizes the first valid DOI found.
5. Uses the normalized DOI for CrossRef lookup.

**PDF text extraction dependency:**

| Package | Reason | Alternatives Considered | Workspace |
| :--- | :--- | :--- | :--- |
| `pdf-parse` | Lightweight PDF text extraction (Node.js) | `pdfjs-dist` server-side (heavier), manual binary parsing (too complex) | `apps/api` |

### 3. DOI Normalization

All DOIs are normalized before storage, duplicate checking, and provider lookup:

```
Input                           → Output
https://doi.org/10.1145/1234567 → 10.1145/1234567
http://dx.doi.org/10.1145/1234  → 10.1145/1234
doi:10.1145/1234567             → 10.1145/1234567
DOI: 10.1145/1234567            → 10.1145/1234567
10.1145/1234567                 → 10.1145/1234567 (already normalized)
```

This prevents duplicate papers caused by different DOI representations.

### 4. Confidence Scoring

When no DOI is found and candidates are returned from search:

| Factor | Weight | Method |
| :--- | :--- | :--- |
| Title similarity | 50% | Token-based Jaccard similarity |
| Author overlap | 30% | Set intersection of author last names |
| Year match | 10% | Exact match = 1.0, ±1 year = 0.5, else 0 |
| Venue match | 10% | Token overlap |

- **Confidence ≥ 0.85:** High confidence candidate. Auto-selects and pre-populates the candidate in the confirmation modal. The user **still reviews, can edit fields, and confirms**.
- **Confidence 0.50–0.84:** Return `status: 'candidates'` — displays candidate list with scores for user selection or manual entry.
- **Confidence < 0.50:** Return `status: 'manual'` — displays empty form for manual entry.

### 5. Environment Variable

```env
CROSSREF_MAILTO=gofranemon@gmail.com
```

- Stored in `.env` (server-side only).
- Never exposed to the frontend.
- Used in CrossRef API requests as the `mailto:` parameter for polite pool access.

---

## Phase 3.4: Backend — Paper CRUD, Sharing & Required Reading

**Goal:** Full Paper lifecycle with clean `/metadata/resolve` pipeline and user confirmation.

### 1. New Files

#### [NEW] `apps/api/src/services/paper.service.ts`

| Method | Purpose |
| :--- | :--- |
| `createPaper(uploaderId, dto)` | Validates input (path ownership, MIME, size), creates `FileAsset` + `Paper` atomically with user-confirmed metadata. On failure, deletes orphaned Storage object. |
| `getPaper(paperId, requesterId)` | Returns paper with access-scoped fields. Joins `file_assets`, `paper_sidebar_fields` (privacy-filtered). |
| `listPapers(requesterId, params)` | Lists papers within the requester's access scope. Supports filtering/metadata search. |
| `updatePaper(paperId, requesterId, dto)` | Uploader-only. Validates reading status is a valid enum (bidirectional). |
| `deletePaper(paperId, requesterId)` | Uploader-only. Deletes paper, `FileAsset` DB row, **and** the Supabase Storage object. |
| `sharePaperToProject(paperId, requesterId, projectId)` | Sets `paper.project_id`. Validates requester is the uploader AND a member of the target project. |
| `markRequiredReading(paperId, supervisorId, dto)` | Supervisor-only. Validates supervisor owns the paper's project. Sets `is_required_reading`, `assigned_by_supervisor_id`, optionally `linked_task_id`. |
| `refreshMetadata(paperId, requesterId)` | Uploader-only. Reruns the metadata pipeline and returns candidates for the user to review. |

#### [NEW] `apps/api/src/routes/paper.routes.ts`

| Method | Path | Auth Middleware | Guard | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/metadata/resolve` | `authenticate` | — | Extract & resolve metadata candidates from uploaded PDF |
| `GET` | `/papers` | `authenticate` | — | List papers visible to current user |
| `POST` | `/papers` | `authenticate` | — | Create FileAsset + Paper with confirmed metadata |
| `GET` | `/papers/search` | `authenticate` | — | Metadata search within accessible papers |
| `GET` | `/papers/export` | `authenticate` | — | Export BibTeX or RIS |
| `GET` | `/papers/:paperId` | `authenticate` | `requirePaperAccess` | Get paper metadata + privacy-filtered sidebar |
| `PATCH` | `/papers/:paperId` | `authenticate` | `requirePaperUploader` | Update metadata/reading status |
| `DELETE` | `/papers/:paperId` | `authenticate` | `requirePaperUploader` | Delete own paper + Storage object |
| `POST` | `/papers/:paperId/metadata/refresh` | `authenticate` | `requirePaperUploader` | Rerun metadata pipeline for existing paper |
| `GET` | `/papers/:paperId/download-url` | `authenticate` | `requirePaperAccess` | Get signed download URL |
| `POST` | `/papers/:paperId/share` | `authenticate` | `requirePaperUploader` | Push paper to shared project library |
| `POST` | `/papers/:paperId/required-reading` | `authenticate`, `requireRole('Supervisor')` | `requirePaperProjectSupervisor` | Mark as required reading |

### 2. Paper Access Guards

#### [NEW] `apps/api/src/middleware/paperGuards.ts`

**`requirePaperAccess(paramName = 'paperId')`**
- Loads the paper.
- Allows if: `uploader_id === userId` OR (`paper.project_id` is set AND user is member of that project).
- Denies Admin (Admin cannot access paper content).
- Attaches `req.paperAccess = { paper, isUploader, isProjectMember, projectRole }`.

**`requirePaperUploader(paramName = 'paperId')`**
- Stricter: only allows if `uploader_id === userId`.

**`requirePaperProjectSupervisor(paramName = 'paperId')`**
- Allows if `paper.project_id` is set AND `userId` is the project owner (Supervisor).

### 3. Duplicate Detection

When creating a paper with a non-null DOI:
1. Normalize the DOI.
2. Query `papers` for any existing row with the same normalized `doi` value.
3. If found, return `409 Conflict` with `{ error: 'A paper with this DOI already exists', existingPaperId: '...' }`.
4. The frontend offers "View existing paper" instead of silently duplicating.

### 4. Paper Deletion Cleanup

When `deletePaper` is called:
1. Load the paper and its `file_asset_id`.
2. Load the `FileAsset` to get the `storage_path`.
3. Delete the Supabase Storage object: `supabaseAdmin.storage.from('papers').remove([storagePath])`.
4. Delete the `FileAsset` DB row (cascades to `Paper` via FK, which cascades to sidebar, annotations, comments, collection links, citation purposes).

---

## Phase 3.5: Backend — Smart Research Sidebar, Annotations & Comments

**Goal:** Structured paper analysis, page-level annotations with persistent positions, collaborative visibility, and project-scoped comments.

### 1. Sidebar Fields Service

Add to `paper.service.ts` or create `apps/api/src/services/sidebar.service.ts`:

| Method | Purpose |
| :--- | :--- |
| `getSidebar(paperId, requesterId)` | Returns sidebar fields with privacy filter. If requester is not the uploader AND `personal_notes_visible = false`, strips `personal_notes` from response. |
| `updateSidebar(paperId, requesterId, dto)` | Uploader-only. Updates any combination of structured fields. |

### 2. Annotations Service

#### [NEW] `apps/api/src/services/annotation.service.ts`

| Method | Purpose |
| :--- | :--- |
| `createAnnotation(paperId, userId, dto)` | Creates annotation with `position_data`. Validates user has paper access. Validates `positionData` has required fields. |
| `listAnnotations(paperId, requesterId)` | **Collaborative:** returns ALL annotations on a shared paper for authorized project members. For personal (unshared) papers, returns only the requester's annotations. |
| `updateAnnotation(annotationId, userId, dto)` | Annotation owner only. |
| `deleteAnnotation(annotationId, userId)` | Annotation owner only. |

#### Annotation Routes (in `paper.routes.ts`)

| Method | Path | Guard | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/papers/:paperId/annotations` | `requirePaperAccess` | List annotations (collaborative) |
| `POST` | `/papers/:paperId/annotations` | `requirePaperAccess` | Create annotation with position data |
| `PATCH` | `/annotations/:id` | `requireAnnotationOwner` | Edit annotation |
| `DELETE` | `/annotations/:id` | `requireAnnotationOwner` | Delete annotation |

#### Sidebar Routes (in `paper.routes.ts`)

| Method | Path | Guard | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/papers/:paperId/sidebar` | `requirePaperAccess` | Load sidebar (privacy-filtered) |
| `PATCH` | `/papers/:paperId/sidebar` | `requirePaperUploader` | Update sidebar fields |

### 3. Paper Comments Service

| Method | Purpose |
| :--- | :--- |
| `addComment(paperId, authorId, body)` | Validates paper is in a shared project AND author is a project member. |
| `listComments(paperId, requesterId)` | Validates paper is shared AND requester is a project member. |

#### Comment Routes (in `paper.routes.ts`)

| Method | Path | Guard | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/papers/:paperId/comments` | `requirePaperAccess` + shared project check | List comments |
| `POST` | `/papers/:paperId/comments` | `requirePaperAccess` + shared project check | Add comment |

---

## Phase 3.6: Backend — Collections, Citation Purpose, Search & Export

**Goal:** Paper organization, citation tracking, metadata search, and BibTeX/RIS export.

### 1. Collection Service

#### [NEW] `apps/api/src/services/collection.service.ts`

| Method | Purpose |
| :--- | :--- |
| `createCollection(ownerId, dto)` | Creates a new collection. |
| `listCollections(ownerId)` | Lists all collections belonging to the user, with paper counts. |
| `updateCollection(collectionId, ownerId, dto)` | Owner-only rename/color change. |
| `deleteCollection(collectionId, ownerId)` | Owner-only. Removes join table rows, does not delete papers. |
| `addPaperToCollection(collectionId, paperId, ownerId)` | Validates both collection and paper ownership. |
| `removePaperFromCollection(collectionId, paperId, ownerId)` | Owner-only. |

#### [NEW] `apps/api/src/routes/collection.routes.ts`

| Method | Path | Guard | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/collections` | `authenticate` | List user's collections |
| `POST` | `/collections` | `authenticate` | Create collection |
| `PATCH` | `/collections/:id` | `authenticate` + owner check | Rename/recolor |
| `DELETE` | `/collections/:id` | `authenticate` + owner check | Delete collection |
| `POST` | `/collections/:id/papers` | `authenticate` + owner check | Add paper to collection |
| `DELETE` | `/collections/:id/papers/:paperId` | `authenticate` + owner check | Remove paper from collection |

### 2. Citation Purpose Service

Add to `paper.service.ts`:

| Method | Purpose |
| :--- | :--- |
| `addCitationPurpose(paperId, requesterId, dto)` | Creates a citation purpose record. Validates paper access. |
| `listCitationPurposes(paperId, requesterId)` | Returns all citation purposes for a paper. |
| `deleteCitationPurpose(purposeId, requesterId)` | Owner of the linked paper only. |

#### Citation Purpose Routes (in `paper.routes.ts`)

| Method | Path | Guard | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/papers/:paperId/citations` | `requirePaperAccess` | List citation purposes |
| `POST` | `/papers/:paperId/citations` | `requirePaperAccess` | Add citation purpose |
| `DELETE` | `/citations/:id` | `authenticate` + ownership check | Delete citation purpose |

### 3. Metadata Search

> **Terminology clarification:** This is **paper metadata search** (title, venue, authors), not full-text PDF content search.

In `paper.service.ts` → `listPapers(requesterId, params)`:

- **Metadata search:** Use the `search_vector` column with `plainto_tsquery()`.
- **Filters:** `projectId`, `collectionId`, `readingStatus`, `year`, `isRequiredReading`.
- **Pagination:** `page` and `limit` (default 20, max 100).
- **Access scope:** ALWAYS filter results to only include papers where `uploader_id = requesterId` OR `project_id IN (user's project memberships)`.

```sql
-- Pseudocode for the access scope filter:
WHERE (
  papers.uploader_id = :userId
  OR papers.project_id IN (
    SELECT project_id FROM project_members WHERE user_id = :userId
    UNION
    SELECT id FROM projects WHERE owner_id = :userId
  )
)
```

### 4. BibTeX & RIS Export

#### [NEW] `apps/api/src/services/export.service.ts`

| Method | Purpose |
| :--- | :--- |
| `exportBibTeX(paperIds, requesterId)` | Generates BibTeX entries for specified papers. Validates access. |
| `exportRIS(paperIds, requesterId)` | Generates RIS entries for specified papers. Validates access. |

Export routes in `paper.routes.ts`:

| Method | Path | Query Params | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/papers/export` | `format=bibtex` or `ris`, `paperIds=...` OR `projectId=...` OR `collectionId=...` | Export papers |

---

## Phase 3.7: Frontend — Paper Library, Upload & Collection Management

**Goal:** Build the user-facing paper library with upload (including automatic metadata extraction flow), collections, and metadata search.

### 1. New Route

Add to `apps/web/src/App.tsx`:

```typescript
if (currentRoute.startsWith('/library') || currentRoute.startsWith('/papers')) {
  return <LibraryRouter onNavigate={navigate} currentRoute={currentRoute} />;
}
```

### 2. New Frontend Components

#### [NEW] `apps/web/src/pages/dashboards/LibraryPage.tsx`

Main library page with:
- **Two-pane layout:** Collection sidebar (left) + Paper grid/list (right).
- **Tab bar:** "My Library" | "Project Library".
- **Search bar** with metadata query input (explicitly labeled "Search by title, authors, venue").
- **Filter pills:** Reading Status, Year, Required Reading, Collection.
- **Paper cards** showing: title, authors, year, venue, reading status badge, metadata confidence indicator, collection tags.
- **Upload Paper button** → opens `UploadPaperModal`.
- **Export button** → "Export as BibTeX" / "Export as RIS" dropdown.
- **Actions per paper card:** Open PDF Viewer, Edit Metadata, Share to Project, Delete.

#### [NEW] `apps/web/src/components/literature/UploadPaperModal.tsx`

Multi-step upload flow:

**Step 1: File Selection & Storage Upload**
- File picker accepting `.pdf` only.
- Uploads directly to Supabase Storage `papers` bucket at `{userId}/{uuid}.pdf`.
- Upload progress indicator during Supabase Storage upload.

**Step 2: Metadata Extraction & Resolution**
- Calls `POST /metadata/resolve` with `{ storagePath, fileName }`.
- Shows loading state: "Extracting metadata from PDF..."
- **If `status: 'resolved'` (high confidence ≥0.85):** Auto-selects and pre-populates metadata form with candidate data and confidence badge. User reviews and can edit all fields.
- **If `status: 'candidates'` (0.50–0.84):** Shows candidate cards with confidence scores and details. User selects one to populate the form, or chooses manual entry.
- **If `status: 'manual'` (<0.50):** Shows empty metadata form for manual entry.
- DOI input field available for manual entry or override at any stage.

**Step 3: User Confirmation & Paper Creation**
- User reviews/edits metadata fields: Title, Authors (tag input), Year, Venue, DOI.
- Shows `metadata_source` and `metadata_confidence` badges.
- User clicks "Add to Library" → calls `POST /papers` with confirmed metadata + storagePath.
- Atomic DB insert creates `FileAsset` and `Paper`. (Rollback deletes Storage object on error).
- **Duplicate detection:** If 409 Conflict returned, shows "Paper with this DOI already exists" with direct link to the existing paper.

#### [NEW] `apps/web/src/components/literature/CollectionSidebar.tsx`

- Lists all user collections with color indicators and paper counts.
- "All Papers" default filter.
- "Required Reading" quick filter.
- "+ New Collection" button → inline name/color input.
- "..." menu on each collection: Rename, Change Color, Delete.

#### [NEW] `apps/web/src/components/literature/PaperCard.tsx`

- Title (truncated), authors summary, year, venue.
- Reading status badge (color-coded: gray=Unread, blue=Reading, green=Read, purple=DeeplyAnalysed).
- Required reading indicator.
- Metadata confidence indicator (e.g., green checkmark for ≥0.85, yellow warning for <0.85).
- Collection color dots.
- Click → opens PDF Viewer page.
- Hover actions: Edit, Share, Delete.

#### [NEW] `apps/web/src/components/literature/PaperMetadataModal.tsx`

- Edit paper metadata: title, authors, year, venue, DOI.
- Reading status selector (bidirectional — any valid status).
- Metadata provenance display (source + confidence).
- "Refresh Metadata" button to rerun the pipeline.

#### [NEW] `apps/web/src/components/literature/SharePaperModal.tsx`

- Lists the user's projects.
- Select a project → `POST /papers/:paperId/share`.
- Confirmation: "Paper will be visible to all project members."

### 3. Frontend API Extensions

Add to `apps/web/src/lib/api.ts` — full API surface for Module 03:

```typescript
// Papers
listPapers(params?: PaperSearchParams): Promise<Paper[]>
resolveMetadata(dto: ResolveMetadataDto): Promise<MetadataResult>
createPaper(dto: CreatePaperDto): Promise<Paper>
getPaper(paperId: string): Promise<Paper>
updatePaper(paperId: string, dto: UpdatePaperDto): Promise<Paper>
deletePaper(paperId: string): Promise<void>
sharePaper(paperId: string, dto: SharePaperDto): Promise<Paper>
markRequiredReading(paperId: string, dto: RequiredReadingDto): Promise<Paper>
refreshMetadata(paperId: string): Promise<MetadataResult>
getDownloadUrl(paperId: string): Promise<{ url: string }>
searchPapers(params: PaperSearchParams): Promise<{ papers: Paper[], total: number }>
exportPapers(format, params): Promise<string>

// Sidebar
getSidebar(paperId: string): Promise<PaperSidebarFields>
updateSidebar(paperId: string, dto): Promise<PaperSidebarFields>

// Annotations
listAnnotations(paperId: string): Promise<PaperAnnotation[]>
createAnnotation(paperId: string, dto): Promise<PaperAnnotation>
updateAnnotation(annotationId: string, dto): Promise<PaperAnnotation>
deleteAnnotation(annotationId: string): Promise<void>

// Collections
listCollections(): Promise<Collection[]>
createCollection(dto): Promise<Collection>
updateCollection(collectionId, dto): Promise<Collection>
deleteCollection(collectionId: string): Promise<void>
addPaperToCollection(collectionId, paperId): Promise<void>
removePaperFromCollection(collectionId, paperId): Promise<void>

// Comments
listPaperComments(paperId: string): Promise<PaperComment[]>
addPaperComment(paperId, dto): Promise<PaperComment>

// Citation Purposes
listCitationPurposes(paperId: string): Promise<CitationPurpose[]>
addCitationPurpose(paperId, dto): Promise<CitationPurpose>
deleteCitationPurpose(purposeId: string): Promise<void>
```

---

## Phase 3.8: Frontend — PDF Viewer, Annotations & Smart Research Sidebar

**Goal:** In-browser PDF reading with highlight/annotation tools (with persistent position data), collaborative annotation display, and the Smart Research Sidebar panel.

### 1. PDF Viewer Page

#### [NEW] `apps/web/src/pages/dashboards/PaperViewerPage.tsx`

Route: `/papers/:paperId`

Three-panel layout:
```
+----------------------------------------------------------------------+
| TopBar: Paper Title | Reading Status | Back to Library | Actions     |
+------------+---------------------------------------+-----------------+
| Annotation |         PDF Viewer (center)            | Smart Research  |
| List       |    rendered with react-pdf              | Sidebar (right) |
| (left,opt) |    highlight overlay layer             |                 |
|            |    sticky note markers                 | Research Gap    |
|            |    collaborative annotations shown     | Limitation      |
|            |    with user avatar/color coding       | Future Work     |
|            |                                        | Dataset Used    |
|            |                                        | Methodology     |
|            |                                        | Results         |
|            |                                        | --------------- |
|            |                                        | Personal Notes  |
|            |                                        | [Lock Private]  |
|            |                                        | --------------- |
|            |                                        | Citation Purpose|
|            |                                        | Comments        |
+------------+---------------------------------------+-----------------+
| StatusBar: Page X of Y | Zoom controls                               |
+----------------------------------------------------------------------+
```

### 2. New Frontend Dependencies

| Package | Reason | Alternatives Considered | Workspace |
| :--- | :--- | :--- | :--- |
| `react-pdf` | PDF rendering in React with page-level access for annotations. Modular enough to access/extend PDF.js directly later. | `pdf.js` directly (lower-level, more code), `@pspdfkit/react` (commercial) | `apps/web` |
| `pdfjs-dist` | Required peer dependency of `react-pdf` | — | `apps/web` |

### 3. Highlight & Annotation Components

#### [NEW] `apps/web/src/components/literature/PdfViewer.tsx`
- Renders PDF pages using `react-pdf` `<Document>` and `<Page>` components.
- **Text layer enabled** for selection.
- **Zoom-invariant highlight overlay layer:** renders highlights dynamically using percentage coordinates:
  `style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%` }}`. Highlights remain perfectly aligned across all zoom levels (`scale`) and screen sizes.
- Sticky note markers on page margins.
- Color-codes annotations by user in collaborative view.
- Modular design: the viewer wraps `react-pdf` so PDF.js can be accessed directly later if needed.

#### [NEW] `apps/web/src/components/literature/HighlightPopover.tsx`
- Appears on text selection in the PDF viewer.
- Calculates scale-invariant normalized percentage coordinates from the selection range relative to the page bounding box:
  ```typescript
  const rects: AnnotationRect[] = Array.from(clientRects).map(r => ({
    x: (r.left - pageRect.left) / pageRect.width,
    y: (r.top - pageRect.top) / pageRect.height,
    width: r.width / pageRect.width,
    height: r.height / pageRect.height,
  }));
  ```
- Actions: "Highlight", "Add Sticky Note", "Send to Sidebar Field" (dropdown of 6 field types).

#### [NEW] `apps/web/src/components/literature/SmartResearchSidebar.tsx`
- Right panel displaying all `PaperSidebarFields`.
- Each field is an editable text area (uploader only) or read-only (other viewers).
- "Personal Notes" section with visibility toggle switch and lock icon.
- Citation Purpose section with purpose type selector and note field.
- Paper Comments thread (if shared project paper).

#### [NEW] `apps/web/src/components/literature/AnnotationList.tsx`
- Left panel (collapsible) showing all annotations sorted by page.
- In collaborative view, shows annotation author name/avatar.
- Click an annotation → scrolls PDF to that page and highlights the position.
- Edit/Delete actions for own annotations only.

### 4. Navigation Updates

Update sidebar navigation in `apps/web/src/components/layout/AppSidebar.tsx`:
- Add "Library" icon (`BookOpen` from Lucide) linking to `/library`.

Update dashboard pages:
- `ResearcherWorkspacePage.tsx`: Add "Recent Papers" section and "Reading Queue" card.
- `SupervisorDashboardPage.tsx`: Add "Required Reading Status" card.

---

## Phase 3.9: End-to-End Verification & Documentation Update

**Goal:** Comprehensive automated test suite, cross-role verification, and WORKLOG update.

### 1. Backend Integration Tests

#### [NEW] `apps/api/src/tests/literature.test.ts`

Update `apps/api/package.json` test script:
```json
"test": "tsx --test --test-concurrency=1 src/tests/auth-rbac.test.ts src/tests/workspace.test.ts src/tests/literature.test.ts"
```

**Test cases (mapped to acceptance criteria):**

| # | Test Case | AC |
| :--- | :--- | :--- |
| 1 | `POST /metadata/resolve`: DOI detected from PDF text → CrossRef metadata returned | AC-2 |
| 2 | `POST /metadata/resolve`: PDF without DOI → OpenAlex fallback returns scored candidates | AC-2 |
| 3 | `POST /papers`: Creates FileAsset + Paper with confirmed metadata | AC-1 |
| 4 | `POST /papers`: Storage path validation rejects path not matching authenticated user | AC-1 |
| 5 | `POST /papers`: MIME type validation rejects non-PDF | AC-1 |
| 6 | `POST /papers`: Failed paper creation triggers Storage orphan cleanup | AC-1 |
| 7 | `POST /papers`: Duplicate DOI (normalized) returns 409 Conflict | AC-3 |
| 8 | `POST /papers`: DOI normalization strips URL prefixes before duplicate check | AC-3 |
| 9 | `PATCH /papers/:id`: Reading status accepts any valid enum value (bidirectional) | AC-4 |
| 10 | `PATCH /papers/:id`: Reading status rejects invalid enum value | AC-4 |
| 11 | `POST /collections`: Researcher creates collection | AC-5 |
| 12 | `POST /collections/:id/papers`: Researcher adds paper to own collection | AC-5 |
| 13 | `POST /papers/:id/annotations`: Researcher creates highlight with position_data | AC-6 |
| 14 | `POST /papers/:id/annotations`: Non-authorized user cannot annotate (403) | AC-6 |
| 15 | `GET /papers/:id/annotations`: Collaborative — project members see all annotations | AC-6 |
| 16 | `POST /papers/:id/annotations` with `linkedSidebarField`: Links highlight to sidebar | AC-7 |
| 17 | `PATCH /papers/:id/sidebar`: Researcher edits all structured fields | AC-8 |
| 18 | `GET /papers/:id/sidebar`: Personal notes are null for non-uploader when hidden | AC-9 |
| 19 | `GET /papers/:id/sidebar`: Supervisor cannot read personal notes while hidden | AC-10 |
| 20 | `PATCH /papers/:id/sidebar`: Toggle `personalNotesVisible=true` → Supervisor can read | AC-10 |
| 21 | `POST /papers/:id/share` → Supervisor reads structured fields for shared paper | AC-11 |
| 22 | `POST /papers/:id/required-reading`: Supervisor marks required reading | AC-12 |
| 23 | `POST /papers/:id/required-reading`: Non-project-supervisor returns 403 | AC-12 |
| 24 | `POST /papers/:id/required-reading` with `linkedTaskId` | AC-13 |
| 25 | `POST /papers/:id/comments`: Project member comments on shared paper | AC-14 |
| 26 | `POST /papers/:id/comments`: Non-project-member returns 403 | AC-14 |
| 27 | `GET /papers/search`: Results never include papers outside access scope | AC-15 |
| 28 | `GET /papers/export?format=bibtex`: Contains only authorized papers | AC-16 |
| 29 | `GET /papers/export?format=ris`: Contains only authorized papers | AC-17 |
| 30 | Admin cannot retrieve paper via `GET /papers/:id` (403) | AC-18 |
| 31 | Admin cannot get download URL via `GET /papers/:id/download-url` (403) | AC-18 |
| 32 | `DELETE /papers/:id`: Deletes paper + FileAsset + Storage object | cleanup |

### 2. Direct Supabase RLS & Option A View Security Tests

#### [NEW] `apps/api/src/tests/literature-rls.test.ts`

Direct database tests using non-admin authenticated Supabase clients to verify RLS privacy boundaries and Option A column masking:

| # | Test Case | Expected Security Behavior |
| :--- | :--- | :--- |
| 1 | Direct Paper Isolation | Researcher A querying `supabase.from('papers').select()` receives 0 rows for Researcher B's unshared papers |
| 2 | Direct Shared Paper Visibility | When Researcher B shares a paper to Project 1, Researcher A (member) can `SELECT` the paper directly |
| 3 | Option A Dynamic Masking View | Direct query on `paper_sidebar_fields_view` by Supervisor on student's shared paper returns `personal_notes: null` when `personal_notes_visible = false`. When set to `true`, returns notes |
| 4 | Direct Annotation Isolation | Direct `SELECT FROM paper_annotations` by non-member of a shared paper or unauthorized user returns 0 rows |
| 5 | Direct Storage Asset Isolation | Direct `SELECT FROM file_assets` by User A on User B's asset returns 0 rows |
| 6 | Direct Write Prevention | Direct `supabase.from('papers').insert(...)` from publishable client without Express API is blocked by RLS |

### 3. Frontend UI Tests

#### [NEW] `apps/web/src/tests/literature-ui.test.tsx`

| # | Test Case |
| :--- | :--- |
| 1 | LibraryPage renders paper list, metadata search bar, and collection sidebar |
| 2 | UploadPaperModal renders file picker and metadata extraction flow |
| 3 | UploadPaperModal shows candidate list when status is 'candidates' |
| 4 | PaperCard renders title, authors, reading status badge, and confidence indicator |
| 5 | CollectionSidebar renders collections with color indicators and paper counts |
| 6 | SmartResearchSidebar renders all 6 structured fields and personal notes section |
| 7 | SmartResearchSidebar shows lock icon when `personalNotesVisible=false` |
| 8 | PaperMetadataModal renders reading status dropdown (all states available) |
| 9 | SharePaperModal renders project list and share confirmation |
| 10 | AnnotationList renders annotations with user info sorted by page |
| 11 | HighlightPopover captures position data and renders actions |
| 12 | PaperCard shows metadata provenance indicator |

### 4. Documentation Updates

#### [MODIFY] `WORKLOG.md`
Add Milestone 4 section documenting all new tables, services, components, and test counts.

#### [MODIFY] `packages/shared-types/src/index.ts`
Add Module 03 section with all new types/enums/DTOs.

#### [MODIFY] `apps/api/src/index.ts`
Mount new route handlers:
```typescript
// Spec 03 API Route Mounts
app.use('/papers', paperRoutes);
app.use('/collections', collectionRoutes);
app.use('/annotations', annotationRoutes);
app.use('/citations', citationRoutes);
```

---

## 12. Verification Plan & Test Cases

### Automated Tests

```bash
# Run full test suite
pnpm test

# Expected results:
# apps/api:  41 existing + 32 new = 73 tests passing
# apps/web:  33 existing + 12 new = 45 tests passing
# Total:     118 tests passing

# Typecheck
pnpm -r typecheck
# Expected: 0 errors
```

### Manual / Browser-in-the-Loop Verification

| Scenario | Steps | Expected Result |
| :--- | :--- | :--- |
| **Upload PDF with DOI in text** | Login → Library → Upload → select PDF containing DOI | System auto-detects DOI, shows CrossRef metadata for confirmation |
| **Upload PDF without DOI** | Upload PDF without embedded DOI | System extracts title, searches OpenAlex/CrossRef, shows candidates with confidence scores |
| **Low-confidence candidate** | Upload obscure PDF | System shows candidate list; user selects correct one or enters manually |
| **Duplicate DOI rejection** | Upload paper with already-existing DOI | Error: "Paper with this DOI already exists" with link |
| **Share paper to project** | Share → select project → confirm | Paper appears in project library; all members see it |
| **Supervisor checks sidebar** | Login as Supervisor → open student's shared paper → view sidebar | Sees structured fields; cannot see Personal Notes (lock icon) |
| **Toggle personal notes** | As Researcher → toggle "Share Personal Notes" ON | Supervisor now sees Personal Notes content |
| **Collaborative annotations** | Researcher A highlights text → Researcher B opens same paper | Both researchers see each other's highlights with user attribution |
| **Required reading** | As Supervisor → mark paper → link to task | Paper shows "Assigned by Supervisor" badge |
| **BibTeX export** | Select papers → Export as BibTeX | Valid `.bib` file with correct entries |
| **PDF viewer annotations** | Open paper → select text → highlight → add note → send to sidebar | Highlight persists after page reload, sidebar field populated |
| **Admin blocked** | Login as Admin → attempt `/papers/:id` | 403 — no paper content visible |
| **Paper deletion cleanup** | Delete paper | Paper, FileAsset, and Storage PDF file all removed |

### Migration Checklist

- [ ] `supabase/migrations/20260903000000_literature_manager.sql` exists and is committed
- [ ] All 8 new tables created with correct constraints
- [ ] 4 new enums created
- [ ] Database trigger for auto-creating sidebar fields works
- [ ] RLS policies enabled and tested on all 8 tables
- [ ] `file_assets` table ready for cross-module reuse
- [ ] Supabase Storage `papers` bucket configured manually via Dashboard
- [ ] `CROSSREF_MAILTO` env var documented and set
- [ ] All existing 74 tests still pass
- [ ] 32 new backend tests pass
- [ ] 12 new frontend tests pass
- [ ] `pnpm -r typecheck` returns 0 errors
- [ ] WORKLOG.md updated
- [ ] Clean git diff reviewed

---

## Complete File Inventory

### New Files (24)

| File | Description |
| :--- | :--- |
| `supabase/migrations/20260903000000_literature_manager.sql` | 4 enums, 8 tables, 1 trigger, 1 tsvector index, 8 RLS policies |
| `apps/api/src/metadata/metadata-provider.ts` | MetadataProvider interface |
| `apps/api/src/metadata/crossref.provider.ts` | CrossRef API provider |
| `apps/api/src/metadata/openalex.provider.ts` | OpenAlex API provider |
| `apps/api/src/metadata/metadata.service.ts` | Metadata orchestrator (DOI extraction, candidate scoring) |
| `apps/api/src/services/fileAsset.service.ts` | FileAsset CRUD + signed URLs + orphan cleanup |
| `apps/api/src/services/paper.service.ts` | Paper CRUD, sharing, required reading, metadata confirm |
| `apps/api/src/services/annotation.service.ts` | Annotation CRUD with collaborative visibility |
| `apps/api/src/services/collection.service.ts` | Collection CRUD + paper assignment |
| `apps/api/src/services/export.service.ts` | BibTeX and RIS export generators |
| `apps/api/src/routes/paper.routes.ts` | Paper REST endpoints |
| `apps/api/src/routes/collection.routes.ts` | Collection REST endpoints |
| `apps/api/src/middleware/paperGuards.ts` | Paper access, uploader, project supervisor guards |
| `apps/api/src/tests/literature.test.ts` | 32 integration tests |
| `apps/web/src/pages/dashboards/LibraryPage.tsx` | Main library page |
| `apps/web/src/pages/dashboards/PaperViewerPage.tsx` | PDF viewer with annotations and sidebar |
| `apps/web/src/components/literature/UploadPaperModal.tsx` | Multi-step upload with metadata extraction |
| `apps/web/src/components/literature/CollectionSidebar.tsx` | Collection list and management |
| `apps/web/src/components/literature/PaperCard.tsx` | Paper display card |
| `apps/web/src/components/literature/PaperMetadataModal.tsx` | Paper metadata editor |
| `apps/web/src/components/literature/SharePaperModal.tsx` | Paper sharing modal |
| `apps/web/src/components/literature/PdfViewer.tsx` | PDF renderer with position-aware highlight overlay |
| `apps/web/src/components/literature/HighlightPopover.tsx` | Text selection actions with position capture |
| `apps/web/src/components/literature/SmartResearchSidebar.tsx` | Structured sidebar + citation purpose + comments |
| `apps/web/src/components/literature/AnnotationList.tsx` | Collaborative annotation list |
| `apps/web/src/tests/literature-ui.test.tsx` | 12 frontend UI tests |

### Modified Files (8)

| File | Change |
| :--- | :--- |
| `packages/shared-types/src/index.ts` | Add Module 03 enums, entities, DTOs (including MetadataSource, AnnotationPositionData, MetadataCandidate) |
| `apps/api/src/index.ts` | Mount paper, collection, annotation, citation route handlers |
| `apps/api/package.json` | Add `pdf-parse` dependency; update test script |
| `apps/web/src/App.tsx` | Add `/library` and `/papers/:paperId` routes |
| `apps/web/src/components/layout/AppSidebar.tsx` | Add Library navigation item |
| `apps/web/src/lib/api.ts` | Add all Literature Manager API methods |
| `apps/web/src/pages/dashboards/ResearcherWorkspacePage.tsx` | Add "Recent Papers" and "Reading Queue" |
| `WORKLOG.md` | Add Milestone 4 documentation |

### New Dependencies (3)

| Package | Workspace | Reason |
| :--- | :--- | :--- |
| `react-pdf` | `apps/web` | PDF rendering in React (wraps PDF.js); modular for future extension |
| `pdfjs-dist` | `apps/web` | Peer dependency of `react-pdf` |
| `pdf-parse` | `apps/api` | Lightweight PDF text extraction for DOI detection on server |

---

## User Review Checklist — All Points Addressed

| # | Requirement | Status | Location in Plan |
| :--- | :--- | :--- | :--- |
| 1 | Automatic DOI extraction from uploaded PDFs | Done | Phase 3.3 §2 |
| 2 | CrossRef DOI lookup | Done | Phase 3.3 §1 (crossref.provider.ts) |
| 3 | OpenAlex/CrossRef fallback search when DOI unavailable | Done | Phase 3.3 §1 (openalex.provider.ts, metadata.service.ts) |
| 4 | Candidate matching + confidence scoring | Done | Phase 3.3 §4 |
| 5 | User confirmation for uncertain metadata | Done | Phase 3.3 §4, Phase 3.7 UploadPaperModal |
| 6 | Pluggable metadata-provider architecture | Done | Phase 3.3 §1 (metadata/ directory) |
| 7 | Metadata provenance/confidence fields | Done | Phase 3.1 `papers` table (metadata_source, metadata_confidence, metadata_last_refreshed_at) |
| 8 | Persistent annotation position/coordinate data | Done | Phase 3.1 `paper_annotations.position_data` JSONB |
| 9 | Collaborative annotations visible to all authorized project members | Done | Section 1 (Annotations), Phase 3.5, RLS policies |
| 10 | No collaborator-level annotation permissions in v1 | Done | Section 1 |
| 11 | RLS + backend authorization (dual layer) | Done | Phase 3.1 RLS policies for all 8 tables |
| 12 | Controlled Supabase Storage paths | Done | Phase 3.2 §2, §3 |
| 13 | Upload rollback / orphan cleanup | Done | Phase 3.2 §4 |
| 14 | Storage object deletion when paper is deleted | Done | Phase 3.4 §4 |
| 15 | Bidirectional reading-status changes | Done | Section 1 (Reading Status), Phase 3.4 |
| 16 | Correct terminology (metadata search, not full-text search) | Done | Phase 3.1 (tsvector section), Phase 3.6 §3 |
| 17 | Citation-purpose feature retained + expanded types | Done | Phase 3.1 enum (added SupportingEvidence, RelatedWork) |
| 18 | `authors TEXT[]` retained for MVP | Done | Phase 3.1 `papers` table |
| 19 | DOI normalization before storage/lookup | Done | Phase 3.3 §3 |
| 20 | PDF/file validation | Done | Phase 3.2 §3 |
| 21 | Documentation/table/file-count inconsistencies fixed | Done | 8 tables, 24 new files, 8 modified files, 3 dependencies |
| 22 | MVP scope kept under control | Done | Section 2 (MVP Scope Prioritization) |

---

## Execution Progress & Activity Log

> This section is actively updated during development to track completed sub-features, files modified, and verification results for Module 03.

### 1. Progress Summary

| Phase | Description | Status | Completed At | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 3.1** | Database Migration & Shared Contracts | **Completed** | 2026-09-03 | 8 tables, 4 enums, triggers, GIN index, RLS policies, Option A view created & applied. Shared types updated. |
| **Phase 3.2** | Backend — Supabase Storage & FileAsset Service | **Completed** | 2026-09-03 | Controlled paths ({userId}/{uuid}.pdf), PDF metadata validation, signed URLs, orphan rollback, paper guards. 12 integration tests added. |
| **Phase 3.3** | Backend — Metadata Provider Architecture & Extraction Pipeline | **Completed** | 2026-09-03 | Pluggable IMetadataProvider, CrossRef + OpenAlex providers with polite mailto pool, PDF DOI extraction, POST /metadata/resolve endpoint. 8 tests added (20 total). |
| **Phase 3.4** | Backend — Paper CRUD, Sharing & Required Reading | **Completed** | 2026-09-03 | Paper lifecycle, access guards, duplicate DOI check with orphan cleanup, full-text tsvector search, sharing & required reading, cascade deletion. 8 tests added (28 total). |
| **Phase 3.5** | Backend — Smart Research Sidebar, Annotations & Comments | **Completed** | 2026-09-03 | Sidebar fields with Option A dynamic privacy masking, zoom-invariant annotations, collaborative visibility, discussion comments. 8 tests added (36 total). |
| **Phase 3.6** | Backend — Collections, Citation Purpose, Search & Export | **Completed** | 2026-09-03 | Collection CRUD with paperCount aggregations & cascade isolation, citation purpose tracking, BibTeX & RIS exports. 8 tests added (44 total). |
| **Phase 3.7** | Frontend — Paper Library, Upload & Collection Management | **Completed** | 2026-09-03 | LibraryPage, multi-step UploadPaperModal with resolve flow, CollectionSidebar, PaperCard, SharePaperModal, PaperMetadataModal. 8 UI tests added (41 web total). |
| **Phase 3.8** | Frontend — PDF Viewer, Annotations & Smart Research Sidebar | **Completed** | 2026-09-03 | react-pdf modular viewer, zoom-invariant highlight overlays, AnnotationList, HighlightPopover, SmartResearchSidebar with Option A dynamic privacy masking, PaperViewerPage. 3 UI tests added (44 web total). |
| **Phase 3.9** | End-to-End Verification & Documentation Update | **Completed** | 2026-09-03 | 44 API integration tests, 7 direct RLS security tests, 44 UI tests, WORKLOG.md Milestone 4 updated. All 136 monorepo tests passing. |

### 2. Activity Log

- **2026-09-03 (Phase 3.9 Completed):**
  - Resolved circular RLS recursion between `projects`, `project_members`, and `papers` via migration `supabase/migrations/20260903000002_fix_rls_circular_recursion.sql` introducing `SECURITY DEFINER` helper functions (`is_project_member`, `is_project_owner`), applied cleanly via Supabase MCP `apply_migration`.
  - Created `apps/api/src/tests/literature-rls.test.ts` verifying 7 direct database security rules using authenticated Supabase clients:
    1. Direct Paper Isolation: Supervisor querying unshared Researcher paper receives 0 rows.
    2. Direct Shared Paper Visibility: Both Researcher and Supervisor directly query shared project paper.
    3. Option A Dynamic Masking View: Supervisor querying `paper_sidebar_fields_view` receives `personal_notes = null` when hidden.
    4. Option A Dynamic Masking: Setting `personal_notes_visible = true` unmasks personal notes for project collaborators.
    5. Direct Annotation Visibility: Project members read collaborative annotations on shared papers.
    6. Direct Storage Asset Isolation: Supervisor direct query on Researcher `file_assets` returns 0 rows.
    7. Direct Write Prevention: Client-direct insert into `papers` without Express API is blocked by RLS.
  - Enhanced workspace dashboards (`ResearcherWorkspacePage.tsx` and `SupervisorDashboardPage.tsx`) with "Literature Library & Reading Queue" and "Literature Oversight & Required Reading" oversight widgets linking to `/literature`.
  - Updated `apps/api/package.json` test script to include `src/tests/literature-rls.test.ts`.
  - Updated `WORKLOG.md` with complete Milestone 4 documentation: schema migrations, services, UI components, architectural rules, test counts (136/136 tests passing), and Spec 04 next module roadmap.
  - Monorepo full verification:
    - **apps/api**: 92 tests passing (4 suites).
    - **apps/web**: 44 tests passing (4 suites).
    - **Monorepo total**: **136 tests passing, 0 failing, 0 regressions** (`pnpm test`).
    - **Typecheck**: **0 errors across all workspaces** (`pnpm -r typecheck`).
    - **Production Build**: Vite production bundle compiled cleanly in 12.4s.
  - **Signed URL Contract Alignment Bugfix:**
    - Resolved property mismatch where `apps/api` returned `{ url }` while `apps/web/PaperViewerPage.tsx` inspected `signedUrlData.signedUrl`, causing `pdfUrl` to be `undefined` and triggering the fallback error state *"Paper not found or access denied"*.
    - Updated `fileAsset.service.ts` and `paper.routes.ts` to return both `signedUrl` and `url` (`{ signedUrl, url, fileName, expiresIn }`).
    - Updated `PaperViewerPage.tsx` to safely resolve `signedUrlData?.signedUrl || signedUrlData?.url`, throw an explicit error on failure, and render granular contextual error messages.

- **2026-09-03 (Phase 3.8 Completed):**
  - Installed approved modular PDF dependencies in `apps/web`: `react-pdf@10.5.0` and `pdfjs-dist@5.4.296`.
  - Implemented `apps/web/src/components/literature/HighlightPopover.tsx`:
    - Scale-invariant floating popover calculating normalized percentage coordinates relative to page dimensions: `x, y, width, height` in `0.0–1.0`.
    - Selected text quote preview, sticky note input toggle, and "Link to Research Gap or Analysis" dropdown (`SIDEBAR_FIELD_TYPES`).
    - Direct integration with `api.createAnnotation`.
  - Implemented `apps/web/src/components/literature/PdfViewer.tsx`:
    - Wraps `react-pdf`'s `<Document>` and `<Page>` components with textLayer and annotationLayer enabled.
    - Floating control bar with page navigation (`Prev`, `Next`, `Page X of Y`), zoom controls (`-15%`, `+15%`, reset `120%`), and 90° page rotation.
    - Scale-invariant highlight overlay layer: highlights rendered using CSS percentage coordinates (`left: ${r.x * 100}%`, `top: ${r.y * 100}%`, etc.), remaining aligned across all zoom levels and window resizes.
    - Color-coded highlights (purple for linked analysis fields, amber for general highlights) and margin sticky note markers with author metadata.
    - Text selection listener triggering `HighlightPopover` on mouseup.
  - Implemented `apps/web/src/components/literature/AnnotationList.tsx`:
    - Collapsible left panel showing all paper annotations sorted by page.
    - Instant search/filter for highlights, notes, and linked fields.
    - Displays author avatar/name, quote preview, sticky note card, and linked field tag.
    - One-click page jumping (`onJumpToPage`) and author-only delete guard.
  - Implemented `apps/web/src/components/literature/SmartResearchSidebar.tsx`:
    - Four-tab comprehensive academic analysis panel:
      1. **Structured Analysis**: Editors for Research Gap, Methodology, Results, Limitations, Future Work, Datasets with save action.
      2. **Personal Notes (Option A Dynamic Privacy Masking)**: Uploader toggle between "Shared with Project" and "Private to Me" with lock banner for collaborators when masked to `null`.
      3. **Citation Purposes**: List of categorized citation roles with typed purpose badges (`Motivation`, `MethodSource`, `DatasetSource`, `ComparisonBaseline`, `ContradictingEvidence`, `SupportingEvidence`, `RelatedWork`) and inline creation form.
      4. **Project Discussion**: Realtime collaborative comment threads on shared papers with author credentials and submission form.
  - Implemented `apps/web/src/pages/dashboards/PaperViewerPage.tsx`:
    - Three-panel academic layout mounting `AnnotationList` (left), `PdfViewer` (center), and `SmartResearchSidebar` (right).
    - Top bar with back to library navigation, paper bibliographic header, bidirectional reading status selector, required reading badge, download PDF action, share to project modal, and panel toggle controls.
  - Mounted `/papers/:paperId` route in `apps/web/src/App.tsx`.
  - Added UI tests in `apps/web/src/tests/literature-ui.test.tsx` verifying `AnnotationList`, `HighlightPopover`, and `SmartResearchSidebar`.
  - Monorepo full verification: **129 tests passing, 0 failing, 0 regressions** (44 web + 85 api); production Vite bundle compiled cleanly in 12.4s.

- **2026-09-03 (Phase 3.7 Completed):**
  - Applied Supabase Storage RLS policies in `supabase/migrations/20260903000001_papers_storage_policies.sql` and remote Supabase database, allowing authenticated users to upload and delete files matching `{userId}/{uuid}.pdf` in private bucket `papers`.
  - Extended web API client `apps/web/src/lib/api.ts` with all Spec 03 methods: `getPapers`, `getPaper`, `getPaperDownloadUrl`, `resolveMetadata`, `createPaper`, `updatePaper`, `deletePaper`, `sharePaper`, `setRequiredReading`, `getCollections`, `createCollection`, `updateCollection`, `deleteCollection`, `addPaperToCollection`, `removePaperFromCollection`, `exportPapers` (browser binary stream trigger), sidebar methods, annotation methods, comment methods, and citation purpose methods.
  - Implemented `apps/web/src/components/literature/CollectionSidebar.tsx`:
    - Two-tier quick views: "All Papers" with live count and "Required Reading" with highlight.
    - Collections manager with color swatches, paper count badges, inline "+ New Collection" modal with color presets, rename, and delete actions.
  - Implemented `apps/web/src/components/literature/PaperCard.tsx`:
    - Scholarly card view displaying title, formatted author summary, year, venue, and working external DOI link.
    - Interactive Reading Status dropdown supporting bidirectional state transitions (`Unread`, `Reading`, `Read`, `DeeplyAnalysed`).
    - Required Reading badge (gold bookmark indicator).
    - Metadata extraction confidence score badge (green checkmark for ≥85%, amber for candidate matches).
    - Collection tag pills with corresponding color dots.
  - Implemented `apps/web/src/components/literature/UploadPaperModal.tsx`:
    - Multi-step upload pipeline:
      1. Drag & drop PDF file picker with 50MB validation, uploading directly to Supabase Storage `{userId}/{uuid}.pdf`.
      2. Automated resolution calling `POST /metadata/resolve` with animated scanning state.
      3. Candidate review & selection for partial matches (0.50–0.84 confidence) or manual entry fallback.
      4. Metadata confirmation form with optional instant collection assignment and project sharing.
      5. Duplicate DOI conflict banner (409) with helpful recovery hint.
  - Implemented `apps/web/src/components/literature/PaperMetadataModal.tsx`:
    - Full bibliographic metadata editor with uploader authorization boundaries and reading status dropdown.
  - Implemented `apps/web/src/components/literature/SharePaperModal.tsx`:
    - Destination project picker with abstract previews and collaborative reading notice.
  - Implemented `apps/web/src/pages/dashboards/LibraryPage.tsx`:
    - Two-pane layout with `CollectionSidebar` on left and responsive paper grid on right.
    - Top bar with "My Library" vs "Project Library" tabs, metadata search input (debounced), reading status filter, year filter, "Export Citations" dropdown (BibTeX / RIS), and "+ Add Paper" CTA.
  - Connected `/literature`, `/library`, and `/papers` routes in `apps/web/src/App.tsx` and configured `isNavigate: true, route: '/literature'` in `apps/web/src/components/layout/AppSidebar.tsx`.
  - Added 8 UI tests in `apps/web/src/tests/literature-ui.test.tsx` testing `CollectionSidebar`, `PaperCard`, `UploadPaperModal`, `PaperMetadataModal`, `SharePaperModal`, and `LibraryPage`.
  - Monorepo full verification: **126 tests passing, 0 failing, 0 regressions** (41 web + 85 api); production Vite bundle compiled cleanly in 22.8s.

- **2026-09-03 (Phase 3.6 Completed):**
  - Created `apps/api/src/services/collection.service.ts`:
    - `createCollection`, `listCollections`, `updateCollection`, `deleteCollection`, `addPaperToCollection`, and `removePaperFromCollection`.
    - Computed aggregated `paperCount` dynamically from junction table `paper_collections`.
    - Ensured collection deletion cascades junction links without deleting underlying paper records.
    - Owner-only authorization verified across all mutations.
  - Created `apps/api/src/services/citationPurpose.service.ts`:
    - Validates typed citation purpose enums (`Motivation`, `MethodSource`, `DatasetSource`, `ComparisonBaseline`, `ContradictingEvidence`, `SupportingEvidence`, `RelatedWork`).
    - Implemented `addCitationPurpose`, `listCitationPurposes`, and `deleteCitationPurpose`.
  - Created `apps/api/src/services/export.service.ts`:
    - Generates standard BibTeX (`@article{...}`) entries with auto-generated citation keys (`[LastName][Year][TitleWord]`).
    - Generates standard RIS (`TY - JOUR ... ER - `) format entries.
    - Resolves requested paper IDs or scoped project/collection papers with access boundary verification.
  - Created `apps/api/src/routes/collection.routes.ts` and mounted at `/collections` in `apps/api/src/index.ts`.
  - Mounted export and citation routes in `apps/api/src/routes/paper.routes.ts`: `GET /papers/export` (placed prior to parameterized routes to avoid route collision), `GET /papers/:paperId/citations`, `POST /papers/:paperId/citations`, `DELETE /citations/:citationId`.
  - Added 8 integration tests in `apps/api/src/tests/literature.test.ts` (tests 37–44) covering collection creation, owner-only rename/recolor, paper additions/removals with dynamic `paperCount` verification, collection deletion isolation, typed citation purpose addition/listing/deletion, and BibTeX & RIS export generation.
  - Monorepo test suite passed: **118 tests passing, 0 failing, 0 regressions** (33 web + 85 api).

- **2026-09-03 (Phase 3.5 Completed):**
  - Created `apps/api/src/services/sidebar.service.ts`:
    - Implemented Option A Dynamic Masking: queries sidebar fields and strictly strips `personal_notes` to `null` whenever the viewer is not the uploader and `personal_notes_visible = false`.
    - Enforced role boundaries: any authorized viewer in a shared project can update structured analysis fields (`research_gap`, `methodology`, `results`, `limitation`, `future_work`, `dataset_used`), while personal notes and visibility toggling are restricted strictly to the original uploader (`403 Forbidden`).
  - Created `apps/api/src/services/annotation.service.ts`:
    - Validates zoom-invariant normalized percentage coordinates (`positionData.rects` with numeric `x`, `y`, `width`, `height`).
    - Enforced collaborative visibility: all project members see all annotations created by collaborators on shared papers; unshared personal papers isolate annotations strictly to the creator.
    - Restricted editing and deletion strictly to the original annotation author (`403 Forbidden`).
  - Created `apps/api/src/services/comment.service.ts`:
    - Implemented paper-level collaborative discussion threads; restricts comments to shared project papers.
    - Attaches author profiles (`fullName`, `role`, `photoUrl`) and orders chronologically.
  - Mounted Phase 3.5 routes in `apps/api/src/routes/paper.routes.ts`: `GET /papers/:paperId/sidebar`, `PATCH /papers/:paperId/sidebar`, `GET /papers/:paperId/annotations`, `POST /papers/:paperId/annotations`, `PATCH /annotations/:annotationId`, `DELETE /annotations/:annotationId`, `GET /papers/:paperId/comments`, `POST /papers/:paperId/comments`.
  - Added 8 integration tests in `apps/api/src/tests/literature.test.ts` (tests 29–36) covering uploader sidebar access, Option A dynamic masking, non-uploader structured field edits, personal note tampering rejection, zoom-invariant annotation creation and validation, collaborative annotation visibility across members, author-only annotation edit/delete, and project discussion comments.
  - Monorepo test suite passed: **110 tests passing, 0 failing, 0 regressions** (33 web + 77 api).

- **2026-09-03 (Phase 3.4 Completed):**
  - Created `apps/api/src/services/paper.service.ts`:
    - `createPaper`: Validates required fields, normalizes DOI, prevents duplicate DOIs per user library with 409 Conflict and orphan storage cleanup rollback, inserts paper row, and triggers auto-creation of blank sidebar row.
    - `getPaperById`: Fetches paper with joined uploader profile, FileAsset, and collections.
    - `listPapers`: Lists personal and project-accessible papers; supports full-text search against PostgreSQL GIN-indexed `search_vector`, filters for reading status, required reading, year, and collection, with pagination.
    - `updatePaper`: Enforces reading status updates (any authorized viewer allowed, bidirectional across all 4 statuses) and bibliographic metadata edits (restricted strictly to the original uploader).
    - `sharePaperWithProject`: Validates uploader identity and membership in destination project, attaching paper to `project_id`.
    - `setRequiredReading`: Allows Supervisor / CoSupervisor to assign or clear required reading and link to project tasks.
    - `deletePaper`: Restricts deletion to original uploader; cascades database deletion to annotations, sidebar fields, and comments, and permanently purges underlying Supabase Storage object.
  - Mounted full paper routes in `apps/api/src/routes/paper.routes.ts`: `POST /papers`, `GET /papers`, `GET /papers/:paperId`, `PATCH /papers/:paperId`, `POST /papers/:paperId/share`, `POST /papers/:paperId/required-reading`, `DELETE /papers/:paperId/required-reading`, `DELETE /papers/:paperId`.
  - Added 8 integration tests to `apps/api/src/tests/literature.test.ts` (tests 21–28) covering paper creation, duplicate DOI rejection with orphan cleanup, full-text search, bidirectional reading status, project sharing, supervisor required reading, and cascade deletion.
  - Monorepo test suite passed: **102 tests passing, 0 failing, 0 regressions** (33 web + 69 api).

- **2026-09-03 (Phase 3.3 Completed):**
  - Installed `pdf-parse@1.1.1` and `@types/pdf-parse` in `apps/api` for lightweight, reliable server-side PDF text extraction.
  - Implemented pluggable metadata architecture in `apps/api/src/services/metadata/`:
    - `types.ts`: Defined `IMetadataProvider` contract, canonical `normalizeDoi` function, and multi-factor `calculateConfidence` scoring algorithm (exact DOI match $\to 0.98$, title Jaccard similarity $\times 0.60$, author overlap $\times 0.25$, year match $\times 0.15$).
    - `crossref.provider.ts`: CrossRef REST API integration (`/works/{doi}` and bibliographic search) utilizing polite pool mailto header (`CROSSREF_MAILTO` / `gofranemon@gmail.com`) with graceful timeout handling.
    - `openalex.provider.ts`: OpenAlex API fallback provider (`/works/https://doi.org/...` and text search) with polite pool integration.
    - `pdfExtraction.service.ts`: First-2-pages text extraction from PDF buffer via `pdf-parse` and regex extraction of canonical DOIs (`/\b(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)/gi`).
    - `metadata.service.ts`: Resolution orchestration pipeline: downloads PDF from storage $\to$ extracts DOI $\to$ queries CrossRef (fallback OpenAlex) $\to$ fallback search by cleaned file name $\to$ deduplicates and scores candidates $\to$ returns `{ status: 'resolved' | 'candidates' | 'manual' }`.
  - Added `POST /metadata/resolve` endpoint in `apps/api/src/routes/paper.routes.ts` with authentication and user ownership checks.
  - Extended `apps/api/src/tests/literature.test.ts` with 8 new integration tests (tests 13–20) covering DOI normalization, confidence calculation, filename query cleaning, text DOI extraction, live CrossRef and OpenAlex queries, unauthenticated/unauthorized rejections, and end-to-end PDF metadata resolution.
  - Monorepo test suite passed: **94 tests passing, 0 failing, 0 regressions** (33 web + 61 api).

- **2026-09-03 (Phase 3.2 Completed):**
  - Ensured private `papers` bucket exists in Supabase Storage (`public = false`).
  - Created `apps/api/src/services/fileAsset.service.ts`:
    - Strict storage path regex and prefix validation: `{userId}/{uuid}.pdf` format scoped to caller.
    - PDF metadata validation: `.pdf` extension, `application/pdf` MIME type, size limit $\le$ 50MB.
    - `createFileAsset`: persists `file_assets` row with full audit trail logging.
    - `getSignedUrl`: generates 1-hour signed URL (`createSignedUrl(path, 3600)`) with strict access boundaries (uploader allowed, project member allowed, non-member 403, and Admin 403 per AC-18).
    - `deleteFileAsset` and `deleteStorageObject`: deletes storage objects and DB records for clean deletion and orphan rollback.
  - Created `apps/api/src/middleware/paperGuards.ts`:
    - `requirePaperViewer`: enforces paper ownership / shared project membership and blocks Admin role with 403.
    - `requirePaperUploader`: verifies caller is original uploader.
    - `requirePaperProjectSupervisor`: verifies supervisor/co-supervisor role in linked project.
  - Created `apps/api/src/routes/paper.routes.ts` with `GET /papers/:paperId/download-url` and mounted into `apps/api/src/index.ts`.
  - Created `apps/api/src/tests/literature.test.ts` with 12 comprehensive integration tests covering path validation, metadata validation, file asset persistence, signed URLs, AC-18 Admin rejection, and clean deletion.
  - Updated `apps/api/package.json` test script to include `literature.test.ts`.
  - Monorepo test suite passed: **86 tests passing, 0 failing, 0 regressions** (33 web + 53 api).

- **2026-09-03 (Phase 3.1 Completed):**
  - Created migration file `supabase/migrations/20260903000000_literature_manager.sql`:
    - 4 Enums: `reading_status`, `sidebar_field_type`, `citation_purpose_type`, `metadata_source`.
    - 8 Tables: `file_assets`, `papers`, `paper_sidebar_fields`, `paper_annotations`, `collections`, `paper_collections`, `citation_purposes`, `paper_comments`.
    - 2 Triggers: `handle_new_paper()` for automatic sidebar row creation; `handle_papers_search_vector()` for search vector generation.
    - GIN index on `papers.search_vector`.
    - Full RLS enabled across all 8 tables with defense-in-depth access policies.
    - Option A: Created `paper_sidebar_fields_view` with `security_invoker = true` and dynamic column masking for `personal_notes`.
    - Realtime publications added for `paper_comments` and `paper_annotations`.
  - Applied migration to remote database via Supabase MCP `apply_migration` (executed cleanly, all tables verified).
  - Updated `packages/shared-types/src/index.ts` with all Spec 03 enums, interfaces, and DTOs.
  - Verified compilation: `pnpm -r typecheck` passed with 0 errors across all 4 packages/apps.
  - Verified regression safety: `pnpm test` passed 100% (74 tests passing: 33 web, 41 api).
