# Spec 03 — Literature Manager

## Goal

Implement Module 3 of `feature-plan.md`: research-paper library management, metadata extraction, DOI lookup, reading status, tags/collections, project sharing, in-browser annotations, the Smart Research Sidebar, citation-purpose storage, search/filtering, duplicate detection, and BibTeX/RIS export. The module must preserve the privacy boundary between structured research notes and private Personal Notes.

**Depends on:** `00-foundation.md`, `01-auth-rbac.md`, `02-research-workspace.md` (for project/task sharing)

**Agent mode:** Plan mode, Agent-assisted autonomy. Use Review-driven autonomy for storage-access changes or data-scope logic.

## Entities & relations

### Paper

```text
Paper {
  id                    uuid PK
  uploaderId            FK→User
  projectId             FK→Project?
  title                 string
  authors               string[]
  year                  int?
  doi                   string? unique
  venue                 string?
  fileAssetId           FK→FileAsset
  readingStatus         enum(Unread, Reading, Read, DeeplyAnalysed)
  isRequiredReading     bool default(false)
  assignedBySupervisorId FK→User?
  linkedTaskId          FK→Task?
  createdAt             datetime
}
```

Full CRUD is uploader-scoped. If attached to a shared project library, Supervisor access is read-scoped according to the project-sharing rule.

### PaperSidebarFields

```text
PaperSidebarFields {
  id                   uuid PK
  paperId              FK→Paper unique
  researchGap          string?
  limitation           string?
  futureWork           string?
  datasetUsed          string?
  methodology         string?
  results              string?
  personalNotes        string?
  personalNotesVisible bool default(false)
}
```

Supervisor may read structured fields for shared project papers, but `personalNotes` remains hidden unless explicitly shared.

### PaperAnnotation

```text
PaperAnnotation {
  id                uuid PK
  paperId           FK→Paper
  userId            FK→User
  page              int
  highlightedText   string
  stickyNote        string?
  linkedSidebarField enum(ResearchGap, Limitation, FutureWork, DatasetUsed, Methodology, Results)?
  createdAt         datetime
}
```

### Collection / PaperCollection

```text
Collection {
  id uuid PK
  ownerId FK→User
  name string
  colorHex string
}

PaperCollection {
  paperId FK→Paper
  collectionId FK→Collection
}
```

Collection access is owner-scoped.

### CitationPurpose

```text
CitationPurpose {
  id           uuid PK
  paperId      FK→Paper
  manuscriptId FK→Manuscript?
  purpose      enum(Motivation, MethodSource, DatasetSource, ComparisonBaseline, ContradictingEvidence)
  note         string?
}
```

### PaperComment

```text
PaperComment {
  id uuid PK
  paperId FK→Paper
  authorId FK→User
  body string
  createdAt datetime
}
```

Comments are only available when the paper is in a shared project library.

### FileAsset

Use the shared `FileAsset` entity for PDF objects.

## Core workflows

### Upload

```text
PDF upload
  ↓
Create FileAsset
  ↓
Create Paper
  ↓
Attempt DOI metadata lookup
  ↓
CrossRef success → enrich
  OR
fallback parser → extract metadata
```

The source feature plan specifies CrossRef as the DOI metadata source and parser fallback.

### Reading state

```text
Unread → Reading → Read → DeeplyAnalysed
```

Do not permit arbitrary state jumps unless the final UX explicitly supports them.

### Private-to-shared boundary

The paper itself may be shared to a project library. Personal Notes remain private by default and require an explicit visibility toggle.

## API endpoints

> Exact REST paths are not prescribed by the source docs; these are proposed implementation contracts.

| Method | Path | Roles | Purpose |
|---|---|---|---|
| GET | `/papers` | Authenticated | List papers visible to current user |
| POST | `/papers` | Researcher/Supervisor | Create paper metadata record after Storage upload |
| GET | `/papers/:paperId` | Authorized viewer | Get paper metadata + accessible sidebar fields |
| PATCH | `/papers/:paperId` | Uploader | Update metadata/status |
| DELETE | `/papers/:paperId` | Uploader | Delete own paper record/file according to storage policy |
| POST | `/papers/:paperId/metadata/refresh` | Uploader | Retry DOI/parser metadata extraction |
| GET | `/papers/:paperId/annotations` | Authorized paper viewer | Read annotations in allowed scope |
| POST | `/papers/:paperId/annotations` | Authorized annotator | Create highlight/note |
| PATCH | `/annotations/:id` | Annotation owner | Edit annotation |
| DELETE | `/annotations/:id` | Annotation owner | Delete annotation |
| GET | `/papers/:paperId/sidebar` | Uploader; Supervisor for allowed shared fields | Load structured sidebar |
| PATCH | `/papers/:paperId/sidebar` | Uploader | Update structured fields and personal-note visibility |
| POST | `/papers/:paperId/share` | Uploader | Push paper to shared project library |
| POST | `/papers/:paperId/required-reading` | Project Supervisor | Mark/add as required reading and optionally link a task |
| POST | `/papers/:paperId/comments` | Shared-project participants | Comment |
| POST | `/collections` | Owner | Create collection |
| PATCH | `/collections/:id` | Owner | Rename/change color |
| POST | `/collections/:id/papers` | Owner | Add paper to collection |
| DELETE | `/collections/:id/papers/:paperId` | Owner | Remove paper from collection |
| GET | `/papers/search` | Authenticated | Search/filter within accessible papers |
| GET | `/papers/export?format=bibtex` | Authenticated, scoped | Export BibTeX |
| GET | `/papers/export?format=ris` | Authenticated, scoped | Export RIS |

### Representative request/response

```json
{
  "title": "Paper title",
  "authors": ["A Author", "B Author"],
  "year": 2026,
  "doi": "10.xxxx/example",
  "venue": "Conference",
  "fileAssetId": "uuid"
}
```

Sidebar update:

```json
{
  "researchGap": "The prior work does not address...",
  "limitation": "Small sample size...",
  "futureWork": "Longitudinal evaluation...",
  "datasetUsed": "Dataset X",
  "methodology": "Transformer-based classification",
  "results": "F1 = 0.91",
  "personalNotes": "My private note",
  "personalNotesVisible": false
}
```

## Role behavior

### Researcher

- Full CRUD on own library.
- Uploads, annotates, fills sidebar fields, tags, and creates collections.
- Personal Notes are private by default.
- Can explicitly share Personal Notes.
- Can push a paper into a shared project library.
- Uses search/filter/export within accessible scope.

### Supervisor

- Has own library plus access to shared project libraries.
- Can view student structured fields for shared papers.
- Cannot see private Personal Notes unless the researcher shares them.
- Can mark a paper as Required Reading.
- Can link Required Reading to a task.
- Can comment on shared paper summaries.

### Admin

- No access to paper content.
- Must not receive paper bytes, sidebar content, annotations, or manuscript-level notes through ordinary Admin APIs.

## Acceptance criteria

- [ ] Researcher can upload a PDF and create a Paper + FileAsset record.
- [ ] PDF metadata can be enriched from DOI/metadata lookup and has a parser fallback.
- [ ] Duplicate DOI is rejected or clearly identified rather than silently creating a second DOI-identical record.
- [ ] Paper reading status uses the declared enum states.
- [ ] Researcher can create collections and assign their own papers to them.
- [ ] Researcher can create page highlights and sticky notes only on papers they can access.
- [ ] A highlight can be linked to a supported Smart Research Sidebar field.
- [ ] Researcher can edit all of their own structured sidebar fields.
- [ ] `personalNotes` are private by default.
- [ ] Supervisor cannot read `personalNotes` while `personalNotesVisible=false`.
- [ ] Supervisor can read structured fields for a paper explicitly shared into a supervised project.
- [ ] A Supervisor can assign Required Reading only for a project they supervise.
- [ ] Required Reading can be linked to a task.
- [ ] Paper comments are unavailable outside the shared-project access scope.
- [ ] Search/filter results never include papers outside the current user's access scope.
- [ ] BibTeX export contains only papers the user is authorized to access.
- [ ] RIS export contains only papers the user is authorized to access.
- [ ] Admin cannot retrieve PDF content or private sidebar notes.
- [ ] No frontend direct table write can bypass Express authorization for Paper or PaperSidebarFields.
