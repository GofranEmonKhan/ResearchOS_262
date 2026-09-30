# Spec 05 — Writing & Review

## Goal

Implement Module 5 of `feature-plan.md`: structured manuscripts, section-based rich text, autosave and version snapshots, citation insertion from Literature Manager, Citation Purpose / “Why Did I Cite This?”, internal reviewer assignment, review comments, revision tracking, comment resolution, submission checklist, and final Supervisor approval. Real-time collaborative editing is explicitly out of scope.

**Depends on:** `00-foundation.md`, `01-auth-rbac.md`, `02-research-workspace.md`, `03-literature-manager.md`

**Agent mode:** Plan mode, Review-driven autonomy. This module contains state transitions, reviewer permissions, and content privacy boundaries.

## Entities & relations

### Manuscript

```text
Manuscript {
  id                    uuid PK
  projectId             FK→Project
  title                 string
  targetVenue           string?
  status                enum(Draft, UnderInternalReview, Revising, Ready, Submitted, Published)
  correspondingAuthorId FK→User?
  createdAt             datetime
}
```

Write access: authors + Supervisor according to project rules.

### ManuscriptAuthor

```text
ManuscriptAuthor {
  manuscriptId   FK→Manuscript
  userId         FK→User
  isCorresponding bool default(false)
}
```

### ManuscriptSection

```text
ManuscriptSection {
  id           uuid PK
  manuscriptId FK→Manuscript
  sectionType  enum(Abstract, Introduction, RelatedWork, Method, Results, Discussion, Conclusion, Other)
  order        int
  content      text
  isAiAssisted bool default(false)
}
```

### ManuscriptVersion

```text
ManuscriptVersion {
  id            uuid PK
  manuscriptId  FK→Manuscript
  versionNumber int
  snapshot      json
  createdBy     FK→User
  createdAt     datetime
}
```

### Citation

```text
Citation {
  id           uuid PK
  manuscriptId FK→Manuscript
  sectionId    FK→ManuscriptSection
  paperId      FK→Paper
  insertedBy   FK→User
  orderIndex   int
}
```

### ReviewAssignment

```text
ReviewAssignment {
  id           uuid PK
  manuscriptId FK→Manuscript
  reviewerId   FK→User
  assignedBy   FK→User
  deadline     date
  createdAt    datetime
}
```

Only Supervisor can assign an internal reviewer.

### ReviewComment

```text
ReviewComment {
  id           uuid PK
  manuscriptId FK→Manuscript
  sectionId    FK→ManuscriptSection
  reviewerId   FK→User
  body         string
  severity     enum(Minor, Major, Blocker)
  status       enum(Open, FixedByResearcher, Resolved, Reopened)
  fixNote      string?
  createdAt    datetime
}
```

Status transitions are role-gated.

### RevisionLog

```text
RevisionLog {
  id               uuid PK
  manuscriptId     FK→Manuscript
  changedBy        FK→User
  changeSummary    string
  relatedCommentId FK→ReviewComment?
  createdAt        datetime
}
```

### ChecklistItem

```text
ChecklistItem {
  id           uuid PK
  manuscriptId FK→Manuscript
  label        string
  isChecked    bool default(false)
  checkedBy    FK→User?
}
```

## Manuscript state machine

```text
Draft
  ↓ Request Review
UnderInternalReview
  ↓ review outcome
Revising
  ↓ fixes + verification
UnderInternalReview
  ↓ Supervisor approval
Ready
  ↓ external submission
Submitted
  ↓ publication
Published
```

Do not permit researchers to skip the internal-review governance step simply by changing the status field.

## “Why Did I Cite This?” behavior

Citation insertion links:

```text
ManuscriptSection
   ↓
Citation
   ↓
Paper
   ↓
CitationPurpose
   +
PaperSidebarFields
```

Hover/detail UI can show:

- citation purpose
- research gap
- relevant note

Only data the manuscript author is authorized to see may be shown.

## API endpoints

> Proposed REST contract based on the source workflows.

| Method | Path | Roles | Purpose |
|---|---|---|---|
| GET | `/projects/:projectId/manuscripts` | Authorized project users | List manuscripts |
| POST | `/projects/:projectId/manuscripts` | Researcher; Supervisor | Create manuscript |
| GET | `/manuscripts/:id` | Authors; Supervisor; assigned reviewer according to scope | Read manuscript |
| PATCH | `/manuscripts/:id` | Authors + Supervisor as allowed | Update metadata |
| PATCH | `/manuscripts/:id/sections/:sectionId` | Authors + Supervisor as allowed | Edit section |
| POST | `/manuscripts/:id/versions` | Authorized author | Create explicit snapshot |
| GET | `/manuscripts/:id/versions` | Authorized project users | List versions |
| POST | `/manuscripts/:id/citations` | Author | Insert citation |
| GET | `/manuscripts/:id/citations/:citationId/context` | Authorized manuscript user | Citation-purpose context |
| PATCH | `/manuscripts/:id/citations/:citationId/purpose` | Author | Set citation purpose/note |
| POST | `/manuscripts/:id/request-review` | Researcher author | Send manuscript to Supervisor |
| POST | `/manuscripts/:id/review-assignments` | Project Supervisor | Assign reviewer |
| GET | `/manuscripts/:id/review-comments` | Author; Supervisor; assigned reviewer | List comments |
| POST | `/manuscripts/:id/review-comments` | Assigned reviewer/Supervisor | Add comment |
| POST | `/review-comments/:id/fix` | Researcher author | Mark Fixed + reply note |
| POST | `/review-comments/:id/resolve` | Supervisor | Verify and Resolve |
| POST | `/review-comments/:id/reopen` | Supervisor | Reopen |
| GET | `/manuscripts/:id/revisions` | Authorized users | Revision history |
| PATCH | `/manuscripts/:id/checklist/:itemId` | Authorized manuscript team | Update checklist |
| POST | `/manuscripts/:id/approve-submission` | Supervisor | Move Ready / unlock submission checklist |
| GET | `/manuscripts/:id/export` | Authorized authors/Supervisor | Generate references/export |

### Request Review

```json
{
  "note": "Draft is ready for internal review."
}
```

### Assign reviewer

```json
{
  "reviewerId": "uuid",
  "deadline": "2026-10-15"
}
```

Only a valid co-supervisor/internal reviewer allowed by project membership may be assigned.

### Review comment

```json
{
  "sectionId": "uuid",
  "body": "Clarify why this baseline was selected.",
  "severity": "Major"
}
```

### Fix comment

```json
{
  "fixNote": "Added justification in Methods section."
}
```

### Citation purpose

```json
{
  "purpose": "ComparisonBaseline",
  "note": "Used as the strongest prior baseline for comparison."
}
```

## Role behavior

### Researcher

- Creates/writes drafts and sections.
- Inserts citations from Literature Manager.
- Uploads figures/files.
- Requests internal review.
- Cannot assign a reviewer.
- Responds to review comments and marks them Fixed with a reply note.
- Cannot mark review comments Resolved.
- Sees revision history of their manuscript.

### Supervisor

- Can co-author and edit according to project/manuscript access.
- Only role that assigns internal reviewers.
- Sets reviewer deadline.
- Reviewer gets comment rights on the assigned manuscript only, not text edit rights.
- Adds/edits review comments.
- Verifies fixes and moves comments to Resolved.
- Can Reopen a resolved comment if needed.
- Gives final Approve for Submission, moving manuscript to Ready.
- Can be corresponding author and view all versions.

### Admin

- No manuscript content access.
- No paper draft, section, citation-note, or review-comment content access through normal APIs.

## Acceptance criteria

- [ ] Researcher can create a manuscript inside an authorized project.
- [ ] Manuscript uses the declared status state machine.
- [ ] Researcher cannot directly set a manuscript from Draft to Ready/Submitted/Published without the required workflow.
- [ ] Real-time collaborative editing is not introduced.
- [ ] Section edits are persisted and version snapshots can be created.
- [ ] Every citation references a Paper and a ManuscriptSection.
- [ ] “Why Did I Cite This?” shows CitationPurpose + authorized paper research context.
- [ ] Researcher cannot assign an internal reviewer.
- [ ] Only the project Supervisor can create ReviewAssignment.
- [ ] Reviewer can comment only on manuscripts they are actually assigned to.
- [ ] Reviewer cannot edit manuscript text.
- [ ] Researcher can transition an Open review comment to FixedByResearcher with a fix note.
- [ ] Researcher cannot transition a comment to Resolved.
- [ ] Supervisor can resolve or reopen comments.
- [ ] Supervisor approval is required before manuscript becomes Ready.
- [ ] RevisionLog records who changed what and which review comment caused the revision where applicable.
- [ ] Submission checklist remains locked until the manuscript is Ready.
- [ ] Admin cannot retrieve manuscript content.
- [ ] Citation export/reference generation includes only authorized manuscript references.
