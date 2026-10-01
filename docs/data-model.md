# ResearchOS — Data Model & Entity Ownership Spec

*Revision 4 — corrected: RBAC now defaults to a `profiles` table lookup instead of a Custom Access Token Hook; ownership rule wording loosened to match what the entities below actually do; explicit RLS/secret-key framing added; key naming updated to Supabase's current publishable/secret format.*

Derived field-by-field from `ResearchOS — Complete Feature Plan (Role-Wise).docx`, organized by the same module numbers so you can cross-check line by line.

**Notation:** plain typed-table notation, framework-agnostic — translates directly into `supabase/migrations/*.sql`. `PK` = primary key, `FK→X` = foreign key to entity X, `?` = nullable, `[]` = array column.

**A naming note that applies everywhere below:** every entity here that needs a user reference is written as `FK→User` / `userId` for brevity. The actual table is physically named **`profiles`** (Supabase's idiomatic convention — see Module 1), whose `id` is a foreign key to Supabase's internally-managed `auth.users.id`. Read `User` throughout as shorthand for `profiles`.

---

## 0. Ownership & RBAC Conventions (apply to every entity below)

1. **Every resource needs a documented, explicit access path** — not necessarily a single mandated column name. Most tables below get an `ownerId` or `projectId`; some legitimately need neither (join tables like `PaperCollection`, lookup tables like `Badge`, Admin-only tables like `AiQuota`). Each entity's **"Owner/access-scope"** line states its actual path — direct ownership, project-based, membership-based, or Admin-only. Don't force a column onto a table that doesn't need one just to satisfy a blanket rule.
2. **Ownership beats role.** A Researcher can only mutate rows they own (or are the `assigneeId` for), unless explicitly shared — enforced in Express RBAC middleware, which reads the authenticated user's id off the verified Supabase JWT and their `role`/`status` from a `profiles` lookup (see Module 1 — this replaced an earlier plan to embed role in a custom JWT claim; the DB-lookup approach is simpler to build correctly and has no token-staleness problem).
3. **Three separate messaging systems, never merged into one table:** `ProjectMessage` (Module 2), `DirectMessage` (Module 7), `ListingInquiry` (Module 6).
4. **Status/state-machine fields are enums** (Postgres `enum` types or `check` constraints), never free text.
5. **Role enum:** `UserRole = Admin | Supervisor | Researcher` (Module 0).
6. **Frontend vs. Express write paths, and why it matters:** the frontend's Supabase client is initialized with the **publishable key** and only ever touches Auth, Storage, and Realtime subscriptions directly. Every table write in this document goes through Express, whose Supabase client is initialized with the **secret key** — which bypasses Row Level Security entirely. That means **Express alone is responsible for every authorization check below; there is no RLS safety net catching a bug in Express's own logic**, because the secret key doesn't go through RLS at all. If you add RLS policies later as defense-in-depth (recommended at least for tables/buckets the frontend *reads* directly via Realtime, since those go through the publishable-key client and *do* hit RLS), they should mirror these same rules, not invent new ones — but they're a second layer, not a substitute for correct checks in Express.
7. **Supabase's built-in JWT `role` claim ≠ your application role.** The claim Supabase issues by default (`anon` / `authenticated` / `service_role` — these Postgres role names are unchanged by the key-format update in §6; only the credential format used to authenticate changed) is a Postgres access role, unrelated to Admin/Supervisor/Researcher. Never write RBAC logic that reads that claim expecting an app role. If a custom claim carrying the app role is added later (via a Custom Access Token Hook), name it `user_role` specifically, distinct from the built-in one — see Module 1 for why v1 doesn't need this at all.
8. **Key naming:** use Supabase's current **publishable** (`sb_publishable_...`) / **secret** (`sb_secret_...`) key format for any new project, not the legacy `anon`/`service_role` keys — Supabase is deprecating the legacy format by end of 2026. Same privilege levels, different names: publishable = anon's privilege, secret = service_role's privilege.

---

## 1. Authentication & Account Module

Supabase Auth owns credential/session mechanics internally (`auth.users`, password hashes, OAuth tokens, refresh token rotation) — you don't model any of that. What you build is the app-specific layer on top.

### profiles
*(this is the entity referred to as `User` everywhere else in this document)*
```
profiles {
  id                  uuid PK  = FK→auth.users.id
  fullName            string
  role                enum(Admin, Supervisor, Researcher)
  status              enum(Active, PendingVerification, Suspended)
  institution         string
  department           string
  researchFieldTags   string[]
  photoUrl            string?
  bio                 string?
  orcidUrl            string?
  scholarUrl          string?
  researchInterests   string[]
  skills              string[]
  reputationPoints    int      default(0)
  createdAt           datetime
  updatedAt           datetime
}
Owner/access-scope: self (id).
Populated by: a Postgres trigger function on `auth.users` (AFTER INSERT) that reads `raw_user_meta_data`
(fullName, roleRequest, institution, department, researchFieldTags — passed via
`supabase.auth.signUp({ options: { data: {...} } })`) and inserts the matching profiles row.
Researcher → status=Active. Supervisor → status=PendingVerification.
Google OAuth note: OAuth doesn't carry your custom signup fields. First-time Google sign-ins should land
on a short "complete your profile" step before the trigger has enough data to finish the row.
```

### How RBAC actually reads role/status (default for v1 — read this before building middleware)
```
No custom JWT claims needed. On each authenticated request:
  1. Express verifies the incoming JWT locally against the project's JWKS endpoint
     (https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json) — confirms authenticity,
     extracts `sub` (the user's id). Cache the public keys; don't hit the endpoint per request.
  2. Express queries `profiles` for that id to get the current `role` and `status`.
  3. RBAC middleware (`requireRole(...roles)`, `requireStatus(Active)`) checks against that live read.

Why this instead of a Custom Access Token Hook: the hook approach embeds role/status into the JWT itself,
which avoids the extra query but introduces staleness — a suspended user's already-issued token keeps its
old claims until it expires or refreshes. A live `profiles` read has no such gap: suspend a user and their
very next request is rejected. The extra query is a non-issue at this project's scale. Revisit the hook
only if you later want Postgres RLS policies that reference role directly, or hit real per-request latency
pressure — neither applies to a course project. If you do add it later, the custom claim must be named
`user_role` (see Ownership & RBAC Conventions §7), never just `role`.
```

### SupervisorVerificationRequest
```
SupervisorVerificationRequest {
  id                uuid PK
  userId            FK→User
  documentUrl       string        // Supabase Storage path
  institutionDomain string
  status            enum(Pending, Approved, Rejected)
  reviewedBy        FK→User?      // Admin
  reviewedAt        datetime?
  rejectionReason   string?
  createdAt         datetime
}
Owner/access-scope: userId (subject); reviewedBy is Admin-only write.
Created via a dedicated Express endpoint after the Supervisor uploads their faculty ID to Supabase Storage.
```

### AuditLog
```
AuditLog {
  id          uuid PK
  actorId     FK→User
  action      string           // "login", "suspend_user", "force_delete_project",
                                // "change_role", "force_password_reset",
                                // "approve_listing", "resolve_dispute", ...
  targetType  string
  targetId    uuid?
  ipAddress   string?
  metadata    json?
  createdAt   datetime
}
Owner/access-scope: Admin-only read. Written system-side on every privileged action.
```

What's not modeled, and why: `EmailVerificationToken` and `RefreshToken` — Supabase Auth manages these internally. A custom JWT-claims table for role/status — the `profiles` lookup above replaces it for v1.

---

## 2. Research Workspace (Projects, Milestones, Tasks)

### Project
```
Project {
  id              uuid PK
  ownerId         FK→User        // Supervisor for supervised; creating Researcher if isPersonal
  isPersonal      bool
  title           string
  abstract        string
  domainTags      string[]
  startDate       date
  endDate         date?
  status          enum(Planning, Ongoing, Writing, Submitted, Completed)
  progressPercent int  computed
  createdAt       datetime
}
Owner/access-scope: ownerId (Supervisor for supervised projects, creating Researcher if isPersonal).
```

### ProjectMember
```
ProjectMember {
  id           uuid PK
  projectId    FK→Project
  userId       FK→User
  projectRole  enum(Member, CoSupervisor)
  addedBy      FK→User
  joinedAt     datetime
}
Owner/access-scope: projectId → Project.ownerId (Project Owner Supervisor) controls add/remove and governance.
Role note: CoSupervisor is an assigned Supervisor on the project. Reviewer is that person's duty in Module 05 for manuscript reviews, not a ProjectMember role. Only Project Owner Supervisor has Module 02 governance authority.
```

### ProjectInvite
```
ProjectInvite {
  id           uuid PK
  projectId    FK→Project
  createdBy    FK→User
  inviteType   enum(Email, Code)
  invitedEmail string?
  code         string?          unique
  maxUses      int?
  usesCount    int   default(0)
  expiresAt    datetime?
  status       enum(Pending, Accepted, Revoked)
}
Owner/access-scope: projectId → Supervisor only can create/revoke.
```

### Milestone
```
Milestone {
  id          uuid PK
  projectId   FK→Project
  name        string
  targetDate  date
  weightPct   int
  status      enum(Pending, InProgress, Completed)
  isLocked    bool  default(false)
  isProposed  bool  default(false)
  proposedBy  FK→User?
}
Owner/access-scope: projectId → Supervisor writes; Researcher may only create with isProposed=true.
```

### Task
```
Task {
  id            uuid PK
  projectId     FK→Project
  milestoneId   FK→Milestone?
  title         string
  description   string
  assigneeId    FK→User
  createdBy     FK→User
  dueDate       date
  priority      enum(Low, Medium, High)
  status        enum(ToDo, InProgress, Submitted, UnderReview, Approved, RevisionRequested)
  progressNote  string?
  revisionNote  string?
  isProposed    bool  default(false)
  proposedBy    FK→User?
}
Owner/access-scope: assigneeId (execute/update status) vs projectId→Supervisor (assign, approve).
Role rule: only Supervisor may set assigneeId on create (except personal projects — self-assign only). Only Supervisor may set status=Approved.
```

### TaskComment
```
TaskComment { id uuid PK, taskId FK→Task, authorId FK→User, body string, createdAt datetime }
Owner/access-scope: taskId → any project member can read/comment.
```

### ProjectMessage
```
ProjectMessage { id uuid PK, projectId FK→Project, senderId FK→User, body string, createdAt datetime }
Owner/access-scope: projectId → project members only.
Realtime: enable Postgres Changes replication on this table; the frontend subscribes directly via
supabase-js with defense-in-depth SELECT RLS policy (project owner OR project member), while Express still owns the write (permission check, persist, done).
```

### Notification
```
Notification {
  id          uuid PK
  userId      FK→User
  type        enum(TaskAssigned, DeadlineIn48h, RevisionRequested, TaskApproved,
                    ReviewDeadline, BookingRequest, ForumReply, MilestoneDue)
  payload     json
  channel     enum(InApp, Email)
  isRead      bool  default(false)
  createdAt   datetime
}
Owner/access-scope: userId (recipient) — read/mark-read only by owner.
Realtime: Postgres Changes on this table drives the in-app notification bell with defense-in-depth SELECT/UPDATE RLS policy (auth.uid() = user_id) without polling.
DeadlineIn48h generation: a pg_cron job scans for tasks due within 48h on a schedule and inserts rows here.
```

---

## 3. Literature Manager

### Paper
```
Paper {
  id             uuid PK
  uploaderId     FK→User
  projectId      FK→Project?
  title          string
  authors        string[]
  year           int?
  doi            string?  unique
  venue          string?
  fileAssetId    FK→FileAsset
  readingStatus  enum(Unread, Reading, Read, DeeplyAnalysed)
  isRequiredReading  bool  default(false)
  assignedBySupervisorId FK→User?
  linkedTaskId   FK→Task?
  createdAt      datetime
}
Owner/access-scope: uploaderId (full CRUD); if projectId set, Supervisor gets read access to structured fields (not Personal Notes unless shared).
```

### PaperSidebarFields
```
PaperSidebarFields {
  id                    uuid PK
  paperId               FK→Paper  unique
  researchGap           string?
  limitation            string?
  futureWork            string?
  datasetUsed           string?
  methodology           string?
  results               string?
  personalNotes         string?
  personalNotesVisible  bool  default(false)
}
Owner/access-scope: paperId → Paper.uploaderId. personalNotes hidden from Supervisor unless personalNotesVisible=true.
```

### PaperAnnotation
```
PaperAnnotation {
  id                uuid PK
  paperId           FK→Paper
  userId            FK→User
  page              int
  highlightedText    string
  stickyNote        string?
  linkedSidebarField enum(ResearchGap, Limitation, FutureWork, DatasetUsed, Methodology, Results)?
  createdAt         datetime
}
Owner/access-scope: userId (annotator) within paperId access.
```

### Collection
```
Collection { id uuid PK, ownerId FK→User, name string, colorHex string }
PaperCollection { paperId FK→Paper, collectionId FK→Collection }
Owner/access-scope: ownerId. PaperCollection itself is a pure join table — no owner column needed, its access follows Collection.ownerId.
```

### CitationPurpose
```
CitationPurpose {
  id           uuid PK
  paperId      FK→Paper
  manuscriptId FK→Manuscript?
  purpose      enum(Motivation, MethodSource, DatasetSource, ComparisonBaseline, ContradictingEvidence)
  note         string?
}
Owner/access-scope: paperId → Paper.uploaderId.
```

### PaperComment
```
PaperComment { id uuid PK, paperId FK→Paper, authorId FK→User, body string, createdAt datetime }
Owner/access-scope: paperId → only reachable if Paper is in a shared project library.
```

---

## 4. Experiment Tracker

### Experiment
```
Experiment {
  id            uuid PK
  projectId     FK→Project
  ownerId       FK→User
  name          string
  purpose       enum(ModelTesting, HyperparameterTuning, DatasetComparison,
                      PerformanceEvaluation, Baseline, Final)
  hypothesis    string?
  date          date
  config        json
  metrics       json
  outputFileIds FK→FileAsset[]
  observation   string?
  status        enum(Draft, Final)
  createdAt     datetime
}
Owner/access-scope: ownerId. Supervisor gets read-only + comment across supervised projects.
```

### ExperimentFlag
```
ExperimentFlag {
  id            uuid PK
  experimentId  FK→Experiment
  flaggedBy     FK→User
  type          enum(NeedsRerun, NotReproducible)
  note          string
  raisedTaskId  FK→Task?
  createdAt     datetime
}
Owner/access-scope: experimentId → write restricted to Supervisor of that project.
```

### TaskExperimentLink
```
TaskExperimentLink { taskId FK→Task, experimentId FK→Experiment }
Owner/access-scope: pure join table, no owner column — access follows Task and Experiment's own scopes.
```

---

## 5. Writing & Review Module

### Manuscript
```
Manuscript {
  id                    uuid PK
  projectId             FK→Project
  title                 string
  targetVenue           string?
  status                enum(Draft, UnderInternalReview, Revising, Ready, Submitted, Published)
  correspondingAuthorId FK→User?
  createdAt             datetime
}
Owner/access-scope: projectId. Write access: authors (ManuscriptAuthor rows) + Supervisor.
```

### ManuscriptAuthor
```
ManuscriptAuthor { manuscriptId FK→Manuscript, userId FK→User, isCorresponding bool default(false) }
```

### ManuscriptSection
```
ManuscriptSection {
  id            uuid PK
  manuscriptId  FK→Manuscript
  sectionType   enum(Abstract, Introduction, RelatedWork, Method, Results, Discussion, Conclusion, Other)
  order         int
  content       text
  isAiAssisted  bool  default(false)
}
Owner/access-scope: manuscriptId → ManuscriptAuthor.
```

### ManuscriptVersion
```
ManuscriptVersion {
  id             uuid PK
  manuscriptId   FK→Manuscript
  versionNumber  int
  snapshot       json
  createdBy      FK→User
  createdAt      datetime
}
Owner/access-scope: manuscriptId.
```

### Citation
```
Citation {
  id            uuid PK
  manuscriptId  FK→Manuscript
  sectionId     FK→ManuscriptSection
  paperId       FK→Paper
  insertedBy    FK→User
  orderIndex    int
}
Owner/access-scope: manuscriptId.
```

### ReviewAssignment
```
ReviewAssignment {
  id            uuid PK
  manuscriptId  FK→Manuscript
  reviewerId    FK→User
  assignedBy    FK→User
  deadline      date
  createdAt     datetime
}
Owner/access-scope: manuscriptId → assignedBy must be Supervisor of the project.
```

### ReviewComment
```
ReviewComment {
  id            uuid PK
  manuscriptId  FK→Manuscript
  sectionId     FK→ManuscriptSection
  reviewerId    FK→User
  body          string
  severity      enum(Minor, Major, Blocker)
  status        enum(Open, FixedByResearcher, Resolved, Reopened)
  fixNote       string?
  createdAt     datetime
}
Owner/access-scope: reviewerId writes body/severity; only Researcher moves Open→FixedByResearcher; only Supervisor moves →Resolved/Reopened.
```

### RevisionLog
```
RevisionLog {
  id                 uuid PK
  manuscriptId       FK→Manuscript
  changedBy          FK→User
  changeSummary      string
  relatedCommentId   FK→ReviewComment?
  createdAt          datetime
}
```

### ChecklistItem
```
ChecklistItem { id uuid PK, manuscriptId FK→Manuscript, label string, isChecked bool default(false), checkedBy FK→User? }
```

---

## 6. Resource Sharing Marketplace

### Listing
```
Listing {
  id                          uuid PK
  ownerId                     FK→User
  type                        enum(Hardware, Dataset)
  title                       string
  gpuCpuModel                 string?
  vram                        string?
  ram                         string?
  storage                     string?
  os                          string?
  location                    string?
  accessMethod                enum(SSH, RemoteDesktop)?
  hourlyPrice                 decimal?
  dailyPrice                  decimal?
  domain                      string?
  sizeBytes                   bigint?
  format                      string?
  license                     string?
  samplePreviewFileId         FK→FileAsset?
  onlinePrice                 decimal?
  isFree                      bool  default(false)
  isInstitutional             bool  default(false)
  freeForInstitutionStudents  bool  default(false)
  approvalStatus              enum(Pending, Approved, Rejected)
  isDelisted                  bool  default(false)
  createdAt                   datetime
}
Owner/access-scope: ownerId. approvalStatus/isDelisted = Admin-only write.
```

### AvailabilitySlot
```
AvailabilitySlot { id uuid PK, listingId FK→Listing, startTime datetime, endTime datetime, isBooked bool default(false) }
```

### Booking
```
Booking {
  id            uuid PK
  listingId     FK→Listing
  requesterId   FK→User
  slotId        FK→AvailabilitySlot?
  status        enum(Requested, Accepted, Rejected, PaymentEscrowed,
                      AccessReleased, Completed, Cancelled, Disputed)
  accessDetails string?
  createdAt     datetime
}
Owner/access-scope: requesterId OR Listing.ownerId.
```

### Transaction
```
Transaction {
  id                uuid PK
  bookingId         FK→Booking
  amount            decimal
  commissionAmount  decimal
  gatewayRef        string
  status             enum(Held, Released, Refunded, Failed)
  invoiceFileId      FK→FileAsset?
  createdAt          datetime
}
Owner/access-scope: bookingId → both parties read; Admin reads all.
```

### ListingReview
```
ListingReview { id uuid PK, bookingId FK→Booking unique, raterId FK→User, rating int, comment string?, createdAt datetime }
Owner/access-scope: raterId; only after Booking.status=Completed.
```

### Dispute
```
Dispute {
  id             uuid PK
  bookingId      FK→Booking
  raisedBy       FK→User
  reason         string
  status         enum(Open, UnderReview, Resolved, Rejected)
  resolvedBy     FK→User?
  resolutionNote string?
  createdAt      datetime
}
Owner/access-scope: raisedBy + Listing.ownerId can view; resolution is Admin-only write.
```

### ListingInquiry
```
ListingInquiry { id uuid PK, listingId FK→Listing, senderId FK→User, body string, createdAt datetime }
Owner/access-scope: listingId participants (requester + owner).
```

---

## 7. Discussion Forum & Research Community

### Post
```
Post {
  id             uuid PK
  authorId       FK→User
  title          string
  body           text
  tags           string[]
  attachmentIds  FK→FileAsset[]
  projectId      FK→Project?
  isPinned       bool  default(false)
  createdAt      datetime
}
Owner/access-scope: authorId (edit/delete own); isPinned settable only by projectId's Supervisor.
```

### Answer
```
Answer {
  id                uuid PK
  postId            FK→Post
  authorId          FK→User
  body              text
  isAccepted        bool  default(false)
  expertVerifiedBy  FK→User?
  expertVerifiedAt  datetime?
  createdAt         datetime
}
```

### Comment
```
Comment { id uuid PK, targetType enum(Post, Answer), targetId uuid, authorId FK→User, body string, createdAt datetime }
```

### Vote
```
Vote { id uuid PK, targetType enum(Post, Answer), targetId uuid, voterId FK→User, value enum(Up, Down), unique(targetType, targetId, voterId) }
```

### Badge / UserBadge
```
Badge { id uuid PK, name string, criteria string }
UserBadge { userId FK→User, badgeId FK→Badge, awardedAt datetime }
```
Owner/access-scope: `Badge` is a global lookup table — no owner column, Admin manages its contents. The "Supervisor / Faculty" verified badge is **not** a `Badge` row — derived from `role==Supervisor && status==Active`.

### TagFollow
```
TagFollow { userId FK→User, tag string }
```

### DirectMessage
```
DirectMessage { id uuid PK, senderId FK→User, recipientId FK→User, body string, createdAt datetime }
Owner/access-scope: senderId + recipientId only. Admin reads metadata only for a Reported conversation.
Realtime: Postgres Changes, scoped so a subscriber only ever receives rows where they're sender or recipient.
```

### UserBlock
```
UserBlock { blockerId FK→User, blockedId FK→User, createdAt datetime }
```

### Report
```
Report {
  id          uuid PK
  targetType  enum(Post, Answer, Comment, DirectMessage)
  targetId    uuid
  reporterId  FK→User
  reason      string
  status      enum(Pending, ActionTaken, Dismissed)
  reviewedBy  FK→User?
  createdAt   datetime
}
```

---

## 8. AI Research Assistant (cross-cutting)

### Embedding
```
Embedding {
  id          uuid PK
  sourceType  enum(Paper, PaperSidebarFields, ManuscriptSection)
  sourceId    uuid
  ownerId     FK→User
  chunkIndex  int
  vector      vector(768)   -- fixed to 768 dimensions (Gemini text-embedding-004)
  createdAt   datetime
}
Owner/access-scope: ownerId. Semantic search runs as a Postgres function (cosine distance via `<=>`),
called through `supabase.rpc('match_embeddings', {...})` from Express.
Vector dimension is 768 for Gemini text-embedding-004 (free tier, active provider).
A migration is required if the provider changes to OpenAI (1536-dim).
```

### AiSuggestion
```
AiSuggestion {
  id              uuid PK
  userId          FK→User          -- owner; always set server-side from JWT, never client-supplied
  targetType      enum(PaperSidebarFields, ManuscriptSection)
  targetId        uuid
  fieldName       string
  suggestedValue  string
  status          enum(Pending, Accepted, Rejected)
  createdAt       datetime
}
Owner/access-scope: userId. Nothing writes to the target field until status=Accepted.
- PaperSidebarFields: writes to paper_sidebar_fields column.
- ManuscriptSection: writes to manuscript_sections.content; also sets is_ai_assisted=true.
Contradiction fixes applied:
  (1) targetType extended to include ManuscriptSection (writing-assistance suggestions).
  (2) userId column added — required for GET /ai/suggestions ownership filter.
```

### AiUsageLog
```
AiUsageLog { id uuid PK, userId FK→User, feature string, tokensUsed int, costUsd decimal?, createdAt datetime }
```

### AiProviderConfig / AiQuota / BlockedPromptRule
```
AiProviderConfig {
  id         uuid PK
  provider   enum(OpenAI, Gemini)
  apiKeyRef  string    -- name of server env var (e.g. "GEMINI_API_KEY"), NOT the raw key
  model      string
  isActive   boolean   -- partial unique index ensures only one row is active at a time
  updatedBy  FK→User
  updatedAt  datetime
}
AiQuota { role enum(Admin, Supervisor, Researcher) PK, monthlyTokenLimit int }
BlockedPromptRule {
  id         uuid PK
  pattern    string    -- plain string; matched via case-insensitive substring (no regex, ReDoS risk)
  reason     string
  createdBy  FK→User
  createdAt  datetime
}
```
Owner/access-scope: Admin-only, all three.
Limitation fixes applied:
  (4) apiKeyRef stores env var name, not the raw key. Backend reads process.env[apiKeyRef] at call time.
  (3) BlockedPromptRule.pattern is a substring match. Regex deferred to v2.
  isActive added to AiProviderConfig to enforce single-active-provider constraint.

### ProgressReport
```
ProgressReport {
  id           uuid PK
  projectId    FK→Project
  studentId    FK→User
  generatedBy  FK→User
  periodStart  date
  periodEnd    date
  content      text
  createdAt    datetime
}
```

---

## 9. Notifications, Search & Dashboard (support layer)

No new entities. Global search uses Postgres full-text (`tsvector`) columns on `Project`, `Task`, `Paper`, `Experiment`, `Manuscript`, `Post`, results filtered through each entity's own access rule per role. Notification centre reads `Notification` (Module 2). Dashboards are aggregate queries scoped by role.

---

## Shared / Cross-Cutting Entities

### FileAsset
```
FileAsset {
  id           uuid PK
  ownerId      FK→User
  storagePath  string     // Supabase Storage bucket + object path
  fileName     string
  mimeType     string
  sizeBytes    bigint
  uploadedAt   datetime
}
```
Referenced by: `Task.attachmentIds`, `Paper.fileAssetId`, `Experiment.outputFileIds`, `Listing.samplePreviewFileId`, `Transaction.invoiceFileId`, `Post.attachmentIds`, `SupervisorVerificationRequest.documentUrl`.

### DeletionRequest
```
DeletionRequest {
  id           uuid PK
  targetType   enum(Project)
  targetId     uuid
  requestedBy  FK→User
  reason       string
  status       enum(Pending, Approved, Rejected)
  decidedBy    FK→User?
  createdAt    datetime
}
Owner/access-scope: Admin-only decision; requestedBy can view own request status. Every decision also writes an AuditLog row.
```

---

## Assumptions & Inferred Entities — full transparency list

| Entity | Why it was inferred | Simplification option |
|---|---|---|
| `SupervisorVerificationRequest` | Needs its own approve/reject lifecycle separate from `profiles.status` | Could collapse into `profiles` fields if you don't need history of rejected attempts |
| `ProjectInvite` | "invite or invite code" join mechanism | — |
| `FileAsset` | Doc mentions "attachments"/"figures"/"output files" in 6 modules separately | Could give each module its own attachment table instead |
| `Citation` vs `CitationPurpose` split | Doc conflates "the reference" and "why you're citing it" | Could merge if you don't need multiple manuscripts citing the same paper for different reasons |
| `ManuscriptSection` as its own table | Needed for `ReviewComment.section` targeting and diffing | Could store sections as JSON on `Manuscript` instead — simpler, less granular |
| `ListingInquiry` vs reusing `DirectMessage` | Doc's messaging-isolation rule isn't explicitly repeated for Module 6 | Reusing `DirectMessage` with an optional `listingId` is a legitimate alternative |
| `Vote`, `Comment` as generic polymorphic tables | Doc doesn't specify schema | Could split into `PostVote`/`AnswerVote` etc. if you dislike polymorphic FKs |
| `DeletionRequest` | Doc says "formal request" without naming the mechanism | Could be a workflow state on `Project` itself |
| `ProgressReport` caching | Could be generated fresh every time | Skip this table entirely if you don't need report history |

Removed: `EmailVerificationToken`, `RefreshToken` (Supabase Auth handles internally). A custom-claims table for role/status was never added — the `profiles` lookup replaces it; see Module 1 for the reasoning and the future upgrade path.

---

## Quick-Reference: Ownership Column by Entity

Paste into `AGENTS.md` or the top of `docs/specs/00-foundation.md`.

| Entity | Owner/scope column(s) | Who can write beyond owner |
|---|---|---|
| profiles (User) | id | Admin (role, status, suspend — via Supabase admin API, secret-key client only) |
| Project | ownerId, isPersonal | — |
| ProjectMember, Milestone, Task | projectId → Project.ownerId | assigneeId (own task status) |
| Paper, PaperSidebarFields, Collection, CitationPurpose | uploaderId / ownerId | Supervisor (read structured fields only, if shared) |
| Experiment, ExperimentFlag | ownerId (Experiment) | Supervisor (read + flag) |
| Manuscript, ManuscriptSection, ManuscriptVersion, Citation | projectId + ManuscriptAuthor | ReviewAssignment.reviewerId (comment only) |
| ReviewComment | reviewerId (create); status transitions role-gated | Supervisor (Resolved/Reopened) |
| Listing, AvailabilitySlot | ownerId | Admin (approvalStatus, isDelisted) |
| Booking, Transaction, Dispute | requesterId + Listing.ownerId | Admin (Transaction read-all, Dispute resolve) |
| Post, Answer, Comment, DirectMessage | authorId / senderId+recipientId | Admin (moderation delete; DM metadata only if reported) |
| Notification | userId (recipient) | system |
| Embedding, AiSuggestion, AiUsageLog | ownerId / userId | Admin (config, quotas, cost analytics) |
| AuditLog, AiProviderConfig, AiQuota, BlockedPromptRule, DeletionRequest decisions | none — Admin-only is the entire path | Admin only, end to end |
| PaperCollection, TaskExperimentLink, ManuscriptAuthor, UserBadge, TagFollow, UserBlock | none — pure join tables | follows the scope of the tables they join |
