# Module 5 Implementation Plan — Manuscript Writing & Internal Peer Review

> **Specification Reference:** [`docs/specs/05-writing-review.md`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/docs/specs/05-writing-review.md)  
> **Data Model Reference:** [`docs/data-model.md`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/docs/data-model.md) §5  
> **Engineering Rules:** [`AGENTS.md`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/AGENTS.md)  
> **Depends On:** Module 00 (Foundation), Module 01 (Auth & RBAC), Module 02 (Research Workspace), Module 03 (Literature Manager)  
> **Status:** Planning Phase — Review-Driven Autonomy

---

## 📑 Table of Contents

1. [Executive Summary & Architectural Scope](#1-executive-summary--architectural-scope)
2. [Source of Truth & Contradiction / Ambiguity Analysis](#2-source-of-truth--contradiction--ambiguity-analysis)
3. [Database Schema & Migration Specifications](#3-database-schema--migration-specifications)
4. [TypeScript Domain Contracts & Shared Types](#4-typescript-domain-contracts--shared-types)
5. [Backend Architecture & API Specifications](#5-backend-architecture--api-specifications)
6. [Frontend Architecture & UI/UX Specifications](#6-frontend-architecture--uiux-specifications)
7. [Security, RBAC & Ownership Verification Matrix](#7-security-rbac--ownership-verification-matrix)
8. [Feature-by-Feature Phased Execution Roadmap](#8-feature-by-feature-phased-execution-roadmap)
9. [Acceptance Criteria & Comprehensive Test Plan](#9-acceptance-criteria--comprehensive-test-plan)

---

## 1. Executive Summary & Architectural Scope

Module 5 provides ResearchOS with an end-to-end **Scholarly Manuscript Authoring, Citation Contextualization, and Internal Peer Review System**. It bridges research projects, literature citations, and supervisor governance into a distraction-free publication pipeline.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         MANUSCRIPT LIFECYCLE WORKFLOW                            │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌───────────────┐     Researcher requests review     ┌─────────────────────┐  │
│   │     DRAFT     │ ─────────────────────────────────► │ UNDER INTERNAL      │  │
│   │ (Autosaving)  │                                    │ REVIEW              │  │
│   └───────▲───────┘                                    └──────────┬──────────┘  │
│           │                                                       │              │
│           │ Fix comments + Re-submit                              │ Assign       │
│           │                                                       │ Reviewers    │
│   ┌───────┴───────┐     Supervisor requests revisions             ▼              │
│   │   REVISING    │ ◄───────────────────────────────── ┌─────────────────────┐  │
│   │(Fix Notes Req)│                                    │ REVIEW COMMENTS     │  │
│   └───────────────┘                                    │ (Minor/Major/Block) │  │
│                                                        └──────────┬──────────┘  │
│                                                                   │ Supervisor   │
│                                                                   │ Approval     │
│                                                                   ▼              │
│   ┌───────────────┐      External Publication          ┌─────────────────────┐  │
│   │   PUBLISHED   │ ◄───────────────────────────────── │    READY / SUBMIT   │  │
│   │ (DOI / Venue) │                                    │ (Checklist Unlocked)│  │
│   └───────────────┘                                    └─────────────────────┘  │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Core Capabilities:
1. **Section-Based Rich Text & LaTeX Editor**: Structured scientific sections (`Abstract`, `Introduction`, `RelatedWork`, `Method`, `Results`, `Discussion`, `Conclusion`, `Other`) with Markdown/LaTeX math formatting.
2. **"Why Did I Cite This?" Citation Graph**: In-text citation insertion directly linked to papers in the project library, surfacing structured synthesis (`Research Gap`, `Limitations`, `Methodology`) and citation purpose tags on hover.
3. **Internal Peer Review Governance**: Supervisor assigns project co-supervisors or internal reviewers with deadlines. Reviewers have comment-only access.
4. **Structured Review Comment State Machine**: Line/section-level comments (`Minor`, `Major`, `Blocker`) with role-gated resolution (`Open` ➔ `FixedByResearcher` ➔ `Resolved` / `Reopened`).
5. **Version Snapshots & Revision Logs**: Immutable point-in-time manuscript snapshots with diff comparisons and audit logs.
6. **Submission Checklist & Export**: Pre-flight publication checks unlocked only upon Supervisor approval, with 1-click Markdown, LaTeX, and BibTeX bundle exports.

> **Architectural Boundary Note:** Per `AGENTS.md` and Spec 05, real-time WebSocket collaborative character-by-character editing (e.g., Google Docs / Operational Transformation) is **explicitly out of scope**. Section-level autosave and version snapshots are used.

---

## 2. Source of Truth & Contradiction / Ambiguity Analysis

In accordance with `AGENTS.md §2`, we evaluated `docs/specs/05-writing-review.md`, `docs/data-model.md §5`, and existing implementations. Here are the clarified rules:

| Entity / Rule | Spec 05 / Data Model | Potential Ambiguity | Resolved Implementation Rule |
| :--- | :--- | :--- | :--- |
| **Manuscript Access Scope** | Belonging to `Project` with `ManuscriptAuthor` list | Can non-author project members view manuscript drafts? | **Read:** All project members can read manuscripts. **Write:** Only declared `ManuscriptAuthor` users and project `Owner`/`CoSupervisor` can edit text. **Comment:** Authors, Supervisors, and assigned `ReviewAssignment` reviewers. |
| **Reviewer Text Editing** | Assigned via `ReviewAssignment` | Can an internal reviewer edit manuscript section text? | **No.** Internal reviewers receive strictly comment-only permissions (`POST /manuscripts/:id/review-comments`). Attempting to edit section text returns `403 Forbidden`. |
| **Comment Status Transition** | `Open` ➔ `FixedByResearcher` ➔ `Resolved` / `Reopened` | Can a researcher resolve their own review comments? | **No.** Researchers can only transition `Open`/`Reopened` ➔ `FixedByResearcher` with a mandatory `fixNote`. Only Supervisors (or the original commenting reviewer) can transition `FixedByResearcher` ➔ `Resolved`. |
| **Submission Approval** | `UnderInternalReview` ➔ `Ready` | Can a researcher mark a paper ready for submission? | **No.** The transition to `Ready` requires explicit Supervisor approval (`POST /manuscripts/:id/approve-submission`). |
| **Submission Checklist Locking** | `ChecklistItem` list | When can checklist items be checked off? | Checklist items remain read-only/locked while the manuscript is in `Draft`, `UnderInternalReview`, or `Revising`. They become interactive only once status is `Ready`. |
| **Citation Privacy** | "Why Did I Cite This?" contextual preview | What if cited paper has private uploader notes? | **Option A Dynamic Masking** (from Spec 03): If the viewer is the paper uploader, show `personalNotes`. Otherwise, `personalNotes` is dynamically masked to `null` while public synthesis fields (`researchGap`, `methodology`) remain visible. |
| **Admin Access Boundary** | Platform Admins | Can Admin read manuscript sections or drafts? | **No.** In accordance with `AGENTS.md §4`, Admins have zero content access to private manuscripts or review comments. |

---

## 3. Database Schema & Migration Specifications

### Migration File: `supabase/migrations/20260907000000_writing_and_review.sql`

```sql
-- ResearchOS — Spec 05: Manuscript Writing & Internal Peer Review Migration
-- Single source of truth for manuscripts, sections, citations, review assignments, comments, and revisions.

-- 1. Create Enums
do $$ begin
  create type manuscript_status as enum (
    'Draft',
    'UnderInternalReview',
    'Revising',
    'Ready',
    'Submitted',
    'Published'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type manuscript_section_type as enum (
    'Abstract',
    'Introduction',
    'RelatedWork',
    'Method',
    'Results',
    'Discussion',
    'Conclusion',
    'Other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type review_comment_severity as enum (
    'Minor',
    'Major',
    'Blocker'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type review_comment_status as enum (
    'Open',
    'FixedByResearcher',
    'Resolved',
    'Reopened'
  );
exception when duplicate_object then null; end $$;

-- 2. Manuscripts Table
create table if not exists public.manuscripts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  abstract_summary text not null default '',
  target_venue text,
  status manuscript_status not null default 'Draft',
  corresponding_author_id uuid references public.profiles(id) on delete set null,
  external_submission_url text,
  published_doi text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Manuscript Authors Table
create table if not exists public.manuscript_authors (
  id uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references public.manuscripts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  author_order integer not null default 1,
  is_corresponding boolean not null default false,
  contribution_role text not null default 'Author',
  created_at timestamptz not null default now(),
  unique(manuscript_id, user_id)
);

-- 4. Manuscript Sections Table
create table if not exists public.manuscript_sections (
  id uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references public.manuscripts(id) on delete cascade,
  section_type manuscript_section_type not null default 'Introduction',
  custom_title text,
  sort_order integer not null default 0,
  content text not null default '',
  word_count integer not null default 0,
  is_ai_assisted boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- 5. Manuscript Citations Table
create table if not exists public.manuscript_citations (
  id uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references public.manuscripts(id) on delete cascade,
  section_id uuid not null references public.manuscript_sections(id) on delete cascade,
  paper_id uuid not null references public.papers(id) on delete cascade,
  citation_key text not null default '',
  order_index integer not null default 0,
  citation_purpose text,
  citation_note text,
  inserted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(section_id, paper_id)
);

-- 6. Review Assignments Table
create table if not exists public.review_assignments (
  id uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references public.manuscripts(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id) on delete cascade,
  deadline date not null,
  instructions text,
  created_at timestamptz not null default now(),
  unique(manuscript_id, reviewer_id)
);

-- 7. Review Comments Table
create table if not exists public.review_comments (
  id uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references public.manuscripts(id) on delete cascade,
  section_id uuid not null references public.manuscript_sections(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  severity review_comment_severity not null default 'Minor',
  status review_comment_status not null default 'Open',
  fix_note text,
  fixed_by uuid references public.profiles(id) on delete set null,
  fixed_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 8. Manuscript Versions (Point-in-Time Snapshots) Table
create table if not exists public.manuscript_versions (
  id uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references public.manuscripts(id) on delete cascade,
  version_number integer not null,
  title text not null,
  description text,
  snapshot jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(manuscript_id, version_number)
);

-- 9. Revision Log Table
create table if not exists public.manuscript_revision_logs (
  id uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references public.manuscripts(id) on delete cascade,
  changed_by uuid not null references public.profiles(id) on delete cascade,
  change_summary text not null,
  related_comment_id uuid references public.review_comments(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 10. Submission Checklist Items Table
create table if not exists public.manuscript_checklist_items (
  id uuid primary key default gen_random_uuid(),
  manuscript_id uuid not null references public.manuscripts(id) on delete cascade,
  label text not null,
  category text not null default 'General',
  is_checked boolean not null default false,
  checked_by uuid references public.profiles(id) on delete set null,
  checked_at timestamptz,
  sort_order integer not null default 0
);

-- 11. Indexes for Fast Access
create index if not exists idx_manuscripts_project on public.manuscripts(project_id);
create index if not exists idx_manuscript_authors_manuscript on public.manuscript_authors(manuscript_id);
create index if not exists idx_manuscript_sections_manuscript on public.manuscript_sections(manuscript_id);
create index if not exists idx_manuscript_citations_section on public.manuscript_citations(section_id);
create index if not exists idx_review_comments_manuscript on public.review_comments(manuscript_id);
create index if not exists idx_review_assignments_reviewer on public.review_assignments(reviewer_id);

-- 12. Row Level Security (RLS) Enablement
alter table public.manuscripts enable row level security;
alter table public.manuscript_authors enable row level security;
alter table public.manuscript_sections enable row level security;
alter table public.manuscript_citations enable row level security;
alter table public.review_assignments enable row level security;
alter table public.review_comments enable row level security;
alter table public.manuscript_versions enable row level security;
alter table public.manuscript_revision_logs enable row level security;
alter table public.manuscript_checklist_items enable row level security;
```

---

## 4. TypeScript Domain Contracts & Shared Types

### Updates to `packages/shared-types/src/index.ts`:

```typescript
// ─── SPEC 05: MANUSCRIPT WRITING & PEER REVIEW TYPES ─────────────────────────

export type ManuscriptStatus = 
  | 'Draft'
  | 'UnderInternalReview'
  | 'Revising'
  | 'Ready'
  | 'Submitted'
  | 'Published';

export type ManuscriptSectionType = 
  | 'Abstract'
  | 'Introduction'
  | 'RelatedWork'
  | 'Method'
  | 'Results'
  | 'Discussion'
  | 'Conclusion'
  | 'Other';

export type ReviewCommentSeverity = 'Minor' | 'Major' | 'Blocker';

export type ReviewCommentStatus = 
  | 'Open'
  | 'FixedByResearcher'
  | 'Resolved'
  | 'Reopened';

export interface Manuscript {
  id: string;
  projectId: string;
  title: string;
  abstractSummary: string;
  targetVenue: string | null;
  status: ManuscriptStatus;
  correspondingAuthorId: string | null;
  externalSubmissionUrl: string | null;
  publishedDoi: string | null;
  createdAt: string;
  updatedAt: string;
  authors?: ManuscriptAuthor[];
  sections?: ManuscriptSection[];
  openCommentCount?: number;
  unresolvedBlockerCount?: number;
}

export interface ManuscriptAuthor {
  id: string;
  manuscriptId: string;
  userId: string;
  authorOrder: number;
  isCorresponding: boolean;
  contributionRole: string;
  createdAt: string;
  user?: Profile;
}

export interface ManuscriptSection {
  id: string;
  manuscriptId: string;
  sectionType: ManuscriptSectionType;
  customTitle: string | null;
  sortOrder: number;
  content: string;
  wordCount: number;
  isAiAssisted: boolean;
  updatedBy: string | null;
  updatedAt: string;
  citations?: ManuscriptCitation[];
  comments?: ReviewComment[];
}

export interface ManuscriptCitation {
  id: string;
  manuscriptId: string;
  sectionId: string;
  paperId: string;
  citationKey: string;
  orderIndex: number;
  citationPurpose: string | null;
  citationNote: string | null;
  insertedBy: string | null;
  createdAt: string;
  paper?: {
    id: string;
    title: string;
    authors: string[];
    year: number | null;
    venue: string | null;
    doi: string | null;
    researchGap?: string | null;
    methodology?: string | null;
    limitations?: string | null;
  };
}

export interface ReviewAssignment {
  id: string;
  manuscriptId: string;
  reviewerId: string;
  assignedBy: string;
  deadline: string;
  instructions: string | null;
  createdAt: string;
  reviewer?: Profile;
  assignedByUser?: Profile;
}

export interface ReviewComment {
  id: string;
  manuscriptId: string;
  sectionId: string;
  reviewerId: string;
  body: string;
  severity: ReviewCommentSeverity;
  status: ReviewCommentStatus;
  fixNote: string | null;
  fixedBy: string | null;
  fixedAt: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reviewer?: Profile;
  fixedByUser?: Profile;
  resolvedByUser?: Profile;
}

export interface ManuscriptVersion {
  id: string;
  manuscriptId: string;
  versionNumber: number;
  title: string;
  description: string | null;
  snapshot: {
    manuscript: Partial<Manuscript>;
    sections: ManuscriptSection[];
    citations: ManuscriptCitation[];
    authors: ManuscriptAuthor[];
  };
  createdBy: string | null;
  createdAt: string;
  creator?: Profile;
}

export interface ManuscriptRevisionLog {
  id: string;
  manuscriptId: string;
  changedBy: string;
  changeSummary: string;
  relatedCommentId: string | null;
  createdAt: string;
  changedByUser?: Profile;
}

export interface ManuscriptChecklistItem {
  id: string;
  manuscriptId: string;
  label: string;
  category: string;
  isChecked: boolean;
  checkedBy: string | null;
  checkedAt: string | null;
  sortOrder: number;
}

// DTOs
export interface CreateManuscriptDto {
  projectId: string;
  title: string;
  targetVenue?: string;
  authorIds?: string[];
  initialSections?: {
    sectionType: ManuscriptSectionType;
    customTitle?: string;
    content?: string;
  }[];
}

export interface UpdateManuscriptDto {
  title?: string;
  targetVenue?: string;
  abstractSummary?: string;
  correspondingAuthorId?: string;
  externalSubmissionUrl?: string;
  publishedDoi?: string;
}

export interface UpdateSectionDto {
  content?: string;
  customTitle?: string;
  isAiAssisted?: boolean;
}

export interface InsertCitationDto {
  sectionId: string;
  paperId: string;
  citationKey?: string;
  citationPurpose?: string;
  citationNote?: string;
}

export interface AssignReviewerDto {
  reviewerId: string;
  deadline: string;
  instructions?: string;
}

export interface CreateReviewCommentDto {
  sectionId: string;
  body: string;
  severity: ReviewCommentSeverity;
}

export interface FixReviewCommentDto {
  fixNote: string;
}
```

---

## 5. Backend Architecture & API Specifications

### Route Layer: `apps/api/src/routes/manuscript.routes.ts`

| Method | Endpoint | Authorization Guard | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/projects/:projectId/manuscripts` | `authenticate`, `requireProjectMember` | Lists all project manuscripts with status and open comment counts |
| `POST` | `/projects/:projectId/manuscripts` | `authenticate`, `requireProjectMember` | Creates new manuscript and scaffolds default scientific sections |
| `GET` | `/manuscripts/:id` | `authenticate`, `requireManuscriptAccess` | Fetches full manuscript, sections, authors, citations, and review assignments |
| `PATCH` | `/manuscripts/:id` | `authenticate`, `requireManuscriptAuthorOrSupervisor` | Updates title, target venue, or corresponding author |
| `PATCH` | `/manuscripts/:id/sections/:sectionId`| `authenticate`, `requireManuscriptAuthorOrSupervisor` | Autosaves section text content and word count |
| `POST` | `/manuscripts/:id/citations` | `authenticate`, `requireManuscriptAuthorOrSupervisor` | Inserts citation linking paper to section |
| `DELETE` | `/manuscripts/:id/citations/:citationId`| `authenticate`, `requireManuscriptAuthorOrSupervisor` | Removes citation |
| `POST` | `/manuscripts/:id/versions` | `authenticate`, `requireManuscriptAuthorOrSupervisor` | Creates immutable point-in-time version snapshot |
| `GET` | `/manuscripts/:id/versions` | `authenticate`, `requireManuscriptAccess` | Lists version history snapshots |
| `POST` | `/manuscripts/:id/request-review` | `authenticate`, `requireManuscriptAuthor` | Transitions `Draft` / `Revising` ➔ `UnderInternalReview` |
| `POST` | `/manuscripts/:id/review-assignments` | `authenticate`, `requireProjectSupervisor` | Assigns internal project member reviewer with deadline |
| `GET` | `/manuscripts/:id/review-comments` | `authenticate`, `requireManuscriptAccess` | Lists all review comments for the manuscript |
| `POST` | `/manuscripts/:id/review-comments` | `authenticate`, `requireManuscriptReviewerOrSupervisor` | Reviewer adds comment with severity |
| `POST` | `/review-comments/:id/fix` | `authenticate`, `requireManuscriptAuthor` | Researcher marks comment `FixedByResearcher` with `fixNote` |
| `POST` | `/review-comments/:id/resolve` | `authenticate`, `requireProjectSupervisor` | Supervisor marks comment `Resolved` |
| `POST` | `/review-comments/:id/reopen` | `authenticate`, `requireProjectSupervisor` | Supervisor reopens comment with feedback |
| `GET` | `/manuscripts/:id/checklist` | `authenticate`, `requireManuscriptAccess` | Returns pre-submission checklist |
| `PATCH` | `/manuscripts/:id/checklist/:itemId` | `authenticate`, `requireManuscriptAuthorOrSupervisor` | Toggles checklist item (unlocked only if `Ready`) |
| `POST` | `/manuscripts/:id/approve-submission` | `authenticate`, `requireProjectSupervisor` | Supervisor marks `Ready`, unlocking submission checklist |
| `GET` | `/manuscripts/:id/export` | `authenticate`, `requireManuscriptAccess` | Exports LaTeX bundle, Markdown, and formatted BibTeX |

---

## 6. Frontend Architecture & UI/UX Specifications

### 1. New Page: `apps/web/src/pages/dashboards/ManuscriptEditorPage.tsx`
* **Route**: `/projects/:projectId/manuscripts/:manuscriptId`
* **Three-Column Scholarly Layout**:
  * **Left Column (Navigation & Outline)**: Section outline pills (`Abstract`, `Introduction`, `Methods`, etc.), word count meter, version history drawer button, and reviewer assignment badges.
  * **Center Column (Distraction-Free Editor)**: Active section editor with Markdown & LaTeX formatting bar, real-time autosave indicator (`Saved 2s ago`), in-text citation chips `[Chen et al., 2025]`, and section comment drawer triggers.
  * **Right Column (Context & Review Drawer)**: 
    * **Tab 1: "Why Did I Cite This?"**: Shows selected citation's paper details, citation purpose, and structured research gap.
    * **Tab 2: Peer Review Comments**: Filter comments by `Open`, `FixedByResearcher`, `Resolved`, and severity (`Blocker` 🚨, `Major` ⚠️, `Minor` 💡).
    * **Tab 3: Submission Checklist**: Interactive verification items unlocked upon Supervisor approval.

```
+-----------------------------------------------------------------------------------------+
| TopBar: [← Project] "Neural Flow Matching..." | Status: [UnderInternalReview] | [Export] |
+-------------------+---------------------------------------------+-----------------------+
| Section Outline   | Center Editor Area                          | Context Drawer        |
|                   | ─────────────────────────────────────────── | ───────────────────── |
| • Abstract (340w) | ## 3. Methodology                           | [Why Did I Cite This?]|
| • Intro (1,200w)  | In this work, we formulate continuous-time  | --------------------- |
| • Methods (2,400w)| flow matching [@chen2024flow] with optimal  | Paper: Chen et al. 24 |
| • Results (1,800w)| transport vector fields...                  | Purpose: Baseline     |
| • Discussion      |                                             | Gap: Scalability in 3D|
| • Conclusion      | [ + Insert Citation ]  [ + Add Figure ]     | --------------------- |
| ───────────────── | ─────────────────────────────────────────── | Review Comments (3)   |
| Word Count: 5,740 | Status: ☁️ Autosaved just now               | 🚨 Blocker (Section 3)|
| Versions: v1.2    |                                             | [Mark Fixed + Note]   |
+-------------------+---------------------------------------------+-----------------------+
```

### 2. Supporting Modal Components:
* **`components/manuscripts/CreateManuscriptModal.tsx`**: Title, target conference/journal, co-author picker.
* **`components/manuscripts/CitationSearchModal.tsx`**: Fast live search across project literature library to insert citations with 1 click.
* **`components/manuscripts/AssignReviewerModal.tsx`**: Supervisor assigns internal co-supervisors/reviewers with date picker and guidelines.
* **`components/manuscripts/VersionHistoryModal.tsx`**: View version list, author notes, and diff comparison.
* **`components/manuscripts/ExportManuscriptModal.tsx`**: Download formatted Markdown, ZIP with LaTeX + Figures + `.bib` file.

---

## 7. Security, RBAC & Ownership Verification Matrix

| Action | Researcher Author | Project Supervisor | Assigned Reviewer | Non-Author Member | Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Create Manuscript** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Edit Section Content** | ✅ | ✅ | ❌ (403) | ❌ (403) | ❌ (403) |
| **Insert / Delete Citation** | ✅ | ✅ | ❌ (403) | ❌ (403) | ❌ (403) |
| **Request Internal Review** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Assign Internal Reviewer** | ❌ (403) | ✅ | ❌ (403) | ❌ (403) | ❌ (403) |
| **Post Review Comment** | ❌ (Self) | ✅ | ✅ | ❌ (403) | ❌ (403) |
| **Mark Comment Fixed** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Resolve / Reopen Comment** | ❌ (403) | ✅ | ❌ | ❌ | ❌ |
| **Approve for Submission** | ❌ (403) | ✅ | ❌ (403) | ❌ (403) | ❌ (403) |
| **Export Manuscript & BibTeX** | ✅ | ✅ | ✅ | ✅ | ❌ (403) |

---

## 8. Feature-by-Feature Phased Execution Roadmap

Following your new git workflow rules (**feature-wise branches, multiple granular commits per branch, merging to `development`**), here is the execution plan:

```
development
  │
  ├── 1. feature/manuscript-schema-types
  │      └── Migrations, shared type contracts, DTOs
  │
  ├── 2. feature/manuscript-editor-api
  │      └── Backend services, routes, autosave, citations & "Why Did I Cite This?"
  │
  ├── 3. feature/peer-review-governance
  │      └── Reviewer assignment, comment state machine (Open/Fixed/Resolved), checklist
  │
  ├── 4. feature/manuscript-ui-editor
  │      └── Frontend editor page, section outline, citation picker, comment trays
  │
  ├── 5. feature/manuscript-export-testing
  │      └── LaTeX/Markdown export, automated test suite (backend + frontend), full integration
  │
  └── 6. feature/manuscript-experiment-figures
         └── Scholarly figure insertion modal, 4 sources (Upload, URL, Presets, Saved Experiment Figures), Overleaf LaTeX path mapping
```

---

## 9. Acceptance Criteria & Comprehensive Test Plan

### Backend Test Suite: `apps/api/src/tests/manuscript.test.ts`
- [ ] **AC-01**: Researcher creates manuscript in authorized project (`201 Created`).
- [ ] **AC-02**: Section autosave updates content, word count, and timestamp (`200 OK`).
- [ ] **AC-03**: Non-author member attempting to edit section text is rejected with `403 Forbidden`.
- [ ] **AC-04**: Citation insertion binds to paper in project library and returns formatted key (`201 Created`).
- [ ] **AC-05**: "Why Did I Cite This?" context endpoint returns paper synthesis while dynamically masking personal notes for non-uploaders.
- [ ] **AC-06**: Researcher author requests internal review, transitioning status `Draft` ➔ `UnderInternalReview`.
- [ ] **AC-07**: Researcher attempting to assign a reviewer is rejected with `403 Forbidden`.
- [ ] **AC-08**: Project Supervisor creates `ReviewAssignment` with deadline (`201 Created`).
- [ ] **AC-09**: Assigned reviewer successfully posts review comment with `Major` severity (`201 Created`).
- [ ] **AC-10**: Unassigned project member attempting to post review comment is rejected with `403 Forbidden`.
- [ ] **AC-11**: Researcher marks review comment `FixedByResearcher` with required `fixNote` (`200 OK`).
- [ ] **AC-12**: Researcher attempting to mark review comment `Resolved` is rejected with `403 Forbidden`.
- [ ] **AC-13**: Supervisor verifies fix and marks comment `Resolved` (`200 OK`).
- [ ] **AC-14**: Supervisor approves submission, moving manuscript to `Ready` (`200 OK`).
- [ ] **AC-15**: Checklist item editing is blocked while in `Draft` and allowed when `Ready`.
- [ ] **AC-16**: Platform Admin attempting to fetch manuscript text is rejected with `403 Forbidden`.

### Frontend Test Suite: `apps/web/src/tests/manuscript-ui.test.tsx`
- [ ] **UI-01**: `ManuscriptEditorPage` renders section outline, active editor, word count, and topbar status badge.
- [ ] **UI-02**: Citation picker modal searches project library and inserts citation chip.
- [ ] **UI-03**: Hovering citation chip displays "Why Did I Cite This?" preview card with research gap.
- [ ] **UI-04**: Review comment drawer renders severity badges (`Blocker`, `Major`, `Minor`) and fix note inputs.
- [ ] **UI-05**: Supervisor review controls display `Approve for Submission` and `Assign Reviewer` buttons only for Supervisors.
- [ ] **UI-06**: Submission checklist renders locked state before approval and interactive checkboxes after approval.
- [ ] **UI-07**: `InsertFigureModal` renders all 4 figure source tabs: `Upload File`, `Image URL`, `Scientific Presets`, and `Saved Experiment Figures`.
- [ ] **UI-08**: Selecting a saved experiment figure automatically loads the clean relative path, metadata caption, and reference label.
- [ ] **UI-09**: Generated LaTeX `\begin{figure}` block correctly formats Overleaf-compatible paths (`figures/<name>.png`).
