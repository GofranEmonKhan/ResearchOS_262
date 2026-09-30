**ResearchOS** **--- Complete Feature Plan (Role-Wise)**

Frontend:   React (Vite) + TypeScript + Tailwind + shadcn/ui + TanStack Query + React Router
Backend:    Node.js + Express + TypeScript   — business logic, RBAC middleware, permission-matrix enforcement
Database:   Supabase Postgres (+ pgvector extension, enabled via migration)
Schema/DB:  Supabase CLI migrations (supabase/migrations/*.sql), CLI installed as a project devDependency — no ORM
Data access: @supabase/supabase-js — secret-key client in Express, publishable-key client in the frontend
            (current key format — replaces the legacy service_role/anon keys Supabase is deprecating by
            end of 2026; new projects should start on publishable/secret keys directly)
Auth:       Supabase Auth (email/password + Google OAuth). RBAC reads role/status from a `profiles` table
            lookup keyed off the verified JWT's user id — no custom JWT claims needed for v1.
Storage:    Supabase Storage
Realtime:   Supabase Realtime — Postgres Changes
Jobs/Queue: deferred — pg_cron + Edge Functions until Phase 8 actually needs a real queue
AI:         OpenAI/Gemini behind a provider-agnostic adapter
Payments:   Stripe (sandbox)
Deploy:     Supabase (hosted) + Railway/Render/Fly.io for apps/api and apps/web

**0. Role Model (read this first)**

  ----------------------- -------------------------------- ----------------------------------------------------------------------------------------------------------------------------------------
  Role                    Who it is                        Core purpose
  **Admin**               Platform owner / department IT   Keeps the platform healthy, safe and legal. Does NOT do research.
  **Supervisor**          Faculty / thesis advisor / PI    Owns and governs research projects, assigns work, approves and reviews tasks of research done by Researcher under him/her supervision.
  **Researcher (User)**   Student / RA / thesis student    Does the actual research work inside projects assigned to them.
  ----------------------- -------------------------------- ----------------------------------------------------------------------------------------------------------------------------------------

**Golden rules of permission design**

**Admin ≠ superuser of content.** Admin can suspend a user or delete an
abusive forum post, but cannot read a researcher\'s private paper draft
or personal notes. (Privacy rule --- good to state in your defense.)

**Supervisor governs, Researcher executes.** Create project, assign
task, approve milestone, assign internal reviewer = Supervisor only. Do
task, upload paper, run experiment, write draft = Researcher.

**Community modules are flat.** Marketplace + Forum treat everyone as
one \"community member\" identity; only Admin has moderation power
there.

**Ownership** **beats** **role.** Inside a project, a Researcher can
only edit rows they created (their own notes, their own experiments),
unless the task is marked \"shared/team\".

**Permission matrix (master summary)**

  ------------------------------------------------ ------------------ ----------------------- -----------------------------------
  Capability                                       Admin              Supervisor              Researcher
  Register / Login / Profile                       ✔                  ✔                       ✔
  Approve supervisor accounts                      ✔                  ✘                       ✘
  Suspend / ban user                               ✔                  ✘                       ✘
  Create research project                          ✘                  ✔                       ✔ (personal project only)
  Add members to project                           ✘                  ✔                       ✘
  Define milestones                                ✘                  ✔                       Propose only
  **Assign task**                                  ✘                  **✔ only**              ✘ (self-task in personal project)
  Submit task for approval                         ✘                  ✘                       ✔
  Approve / request revision                       ✘                  ✔                       ✘
  Upload paper to library                          ✘                  ✔                       ✔
  Write structured paper notes                     ✘                  ✔                       ✔
  Read others\' personal notes                     ✘                  ✔ (own students only)   ✘
  Create / run experiment                          ✘                  ✘                       ✔
  View experiment comparison                       View-only          ✔ (view + comment)      ✔ (full)
  Write manuscript draft                           ✘                  ✔ (co-author)           ✔
  **Assign internal reviewer**                     ✘                  **✔ only**              ✘
  Give review comments                             ✘                  ✔                       ✔ (only if assigned as reviewer)
  Mark comment \"Resolved\"                        ✘                  ✔ (verify)              ✔ (mark fixed)
  Post hardware/dataset listing                    ✘                  ✔                       ✔
  Book / rent resource                             ✘                  ✔                       ✔
  Payment gateway settings & refunds               ✔                  ✘                       ✘
  Forum post / answer / DM                         ✔ (as moderator)   ✔                       ✔
  Delete any forum content                         ✔                  ✘ (own posts only)      ✘ (own posts only)
  AI Assistant (summarize, gap, semantic search)   ✘                  ✔                       ✔
  Set AI quota / API keys                          ✔                  ✘                       ✘
  Platform analytics dashboard                     ✔ (global)         ✔ (own projects)        ✔ (own work)
  ------------------------------------------------ ------------------ ----------------------- -----------------------------------

**1. Authentication & Account Module**

**Feature details:** Email + password registration with JWT session,
Google OAuth one-click sign-in, email verification, forgot/reset
password, role selection at signup, profile setup, session logout &
token refresh.

**What must exist for this** **feature**

Signup form: name, institutional email, password, **role request**
(Researcher / Supervisor), institution, department, research field tags.

OTP / email-verification link, expiry 15 min.

JWT access token (short life) + refresh token; Express verifies JWT
against cached JWKS and resolves application role & status via a live
`profiles` lookup (no custom JWT claims / hooks in v1).

Role-Based Access Control (RBAC) middleware in Express --- every API
route checks req.user.role and req.user.status.

Profile page: photo, bio, ORCID/Scholar link, research interests,
skills.

Audit log table (who logged in, from where).

**Role-wise** **behaviour**

**Researcher:** Signs up freely and is auto-activated. Lands on \"My
Workspace\" dashboard. Can join a project only through a supervisor\'s
invite or invite code.

**Supervisor:** Signs up but account goes to **Pending Verification**
--- must be approved by Admin (upload faculty ID / institutional email
domain check). Until approved they can browse but cannot create
projects. Lands on \"Supervision Dashboard\".

**Admin:** No public signup. Seeded account or promoted by an existing
Admin. Lands on \"Admin Console\". Can force password reset, suspend, or
delete an account, and can change any user\'s role.

**2. Research Workspace (Projects, Milestones, Tasks)**

**Feature details:** Create research projects, define milestones, assign
tasks, track progress, calendar & deadlines, supervisor approval
workflow, activity timeline, notifications.

**What must exist**

Project entity: title, abstract, domain tags, start/end date, status
(Planning / Ongoing / Writing / Submitted / Completed), members list
with per-project role.

Milestone entity: name, target date, weight %, linked tasks, status.

Task entity: title, description, assignee, due date, priority,
deliverable notes/attachments (via progressNote & comment threads), status (To-Do → In Progress → Submitted → Under Review →
Approved / Revision Requested).

Kanban board + list view + milestone timeline.

Calendar view merging task deadlines, milestone dates, meeting slots.

Progress auto-calculation: % of approved tasks weighted by milestone (or unweighted task ratio fallback).

Notification engine (in-app + email) for assignment, deadline in 48h,
revision requested, approval.

Comment thread on every task.

Researcher and supervisor can message in each project. Like inside every
project there is a chatbox where researcher can communicate and these
messages will not mixed to centralized messaging.

**Role-wise** **behaviour**

*Supervisor*

Creates the project and becomes Project Owner.

Adds/removes members, sets each member's project role (Member /
Co-supervisor). (Note: "Reviewer" is that Co-Supervisor's manuscript review duty in Module 05, not a ProjectMember role). Only the Project Owner Supervisor holds Module 02 governance authority.

Defines milestones and deadlines. **Only the supervisor can assign a
task to another person.**

Sees the Supervisor Approval Workflow queue: Submitted work → review →
**Approve** or **Request Revision + feedback note** (loops the task back
to the researcher).

Dashboard: all supervised projects, all students, overdue tasks per
student, progress heatmap.

Can lock a milestone so tasks under it cannot be edited after approval.

*Researcher*

Sees only projects they are a member of, plus their own personal
projects.

Can create a **personal project** (no supervisor attached) and
self-assign tasks there --- this is the only place they may \"assign\".

Inside a supervised project: updates task status, uploads deliverable,
writes progress note, clicks **Submit for Approval**. Cannot mark a task
\"Approved\" themselves.

Can *propose* a milestone or task (\"Request\") --- it appears in the
supervisor\'s queue as a suggestion.

Personal calendar shows only their own deadlines.

*Admin*

Cannot open project content. Sees only aggregate metadata: number of
projects, active/inactive, storage used, project owner.

Can archive or transfer a project when a supervisor leaves the
institution.

Can force-delete a project only on a formal request (logged in the audit
trail).

**3. Literature Manager**

**Feature details:** Upload research papers (PDF), automatic metadata
extraction (title, authors, year, DOI, venue), reading-status tracking,
tags & collections, PDF annotation/highlighting, Smart Research Sidebar
with structured fields, citation-purpose store.

**What must exist**

PDF upload to S3/local, DOI-based metadata fetch (CrossRef) + fallback
parsing.

Reading status: Unread / Reading / Read / Deeply Analysed.

Tags, colour-coded collections, per-project library and per-user
personal library.

In-browser PDF viewer with highlight, sticky note, and \"send highlight
to sidebar field\".

**Smart Research Sidebar fields per paper:** Research Gap, Limitation,
Future Work, Dataset Used, Methodology, Results, Personal Notes.

**Citation Purpose field** --- why this paper will be cited (motivation
/ method source / dataset source / comparison baseline / contradicting
evidence). This powers the \"Why did I cite this?\" feature in Module 5.

Search + filter by tag, year, status, field content; duplicate detection
by DOI.

Export as BibTeX / RIS.

**Role-wise** **behaviour**

*Researcher*

Full CRUD on their own library. Uploads, annotates, fills sidebar
fields, tags.

Personal Notes field is **private by default**; a toggle makes it
visible to the supervisor/team.

Can push a paper into a shared project library so teammates see it.

*Supervisor*

Has own library plus read access to every **shared** project library.

Can view a student\'s structured fields (gap/limitation/future work) to
check reading quality --- but not the private Personal Notes unless
shared.

Can add a paper as **Required Reading** for a project; it appears in the
student\'s library with a \"Assigned by supervisor\" badge and can be
linked to a task.

Can comment on a student\'s paper summary.

*Admin*

No access to paper content.

**4. Experiment Tracker**

**Feature details:** Create experiments, store parameters, compare
experiments, result visualization, experiment history, experiment
purpose tagging, dataset linking.

**What must exist**

Experiment entity: name, linked project, purpose (Model Testing /
Hyperparameter Tuning / Dataset Comparison / Performance Evaluation /
Baseline / Final), hypothesis, date.

Config block: model, hyperparameters (key-value/JSON), dataset used,
hardware used, code/commit link or notebook file, environment notes.

Result block: metrics (accuracy, RMSE, R², F1 --- user-definable etc),
output files, plots/images upload, observation text.

Compare view: select 2--5 experiments → side-by-side parameter diff
table + metric bar/line chart.

**Role-wise** **behaviour**

*Researcher*

Creates, edits, deletes their own experiments;

Attaches an experiment to a task so submitting the task shows the run
evidence.

Marks an experiment \"Final/Reported\" --- after that it is locked from
editing .

*Supervisor*

Read-only across all experiments in supervised projects, plus compare
and comment.

Can flag an experiment as \"Needs Rerun\" or \"Not Reproducible\" with a
note, which raises a revision task for the researcher.

*Admin*

No visibility of parameters or results.

**5. Writing & Review Module**

**Feature details:** Write research papers (structured sections/rich
text), manage citations from the library, assign reviewers, review
comments, track revisions, resolve comments, \"Why Did I Cite This?\"
panel.

**What must exist**

Manuscript entity: title, target venue, sections (Abstract, Intro,
Related Work, Method, Results, Discussion, Conclusion etc), authors,
status (Draft → Under Internal Review → Revising → Ready → Submitted →
Published).

Rich-text editor (not real-time collaborative editing --- out of scope),
autosave, version snapshots with diff.

Citation insert from Literature Manager → hovering a citation shows the
stored **Citation Purpose**, research gap and your note = the \"Why did
I cite this?\" panel.

Reference list auto-generation (IEEE / APA / Springer styles) + BibTeX
export for Overleaf.

Review object: reviewer, section, comment, severity (Minor / Major /
Blocker), status (Open → Fixed by Researcher → Verified/Resolved →
Reopened).

Revision log: what changed, by whom, when, against which comment.

Submission checklist (plagiarism check done, figures at 300 dpi,
references formatted, etc.).

**Role-wise** **behaviour**

*Researcher (author)*

Creates and writes the draft, inserts citations, uploads figures.

Cannot assign a reviewer. Can only click **Request Review** → goes to
the supervisor.

Responds to each comment, marks it **Fixed** with a reply note. Cannot
close a comment as Resolved by themselves.

Sees revision history of their own manuscript.

*Supervisor*

**Only role that can assign internal reviewers** (a co-supervisor) and
set a review deadline. When a supervisor assigns a co-supervisor as
internal reviewer, that person gets comment rights on that one
manuscript only, and no edit rights on the text. This internal reviewer
Can mark severity, suggest text, and later re-check a Fixed comment.

Adds comments, verifies fixes, and moves a comment to **Resolved**.

Gives final **Approve for Submission** --- flips the manuscript to Ready
and unlocks the export/submission checklist.

Can be listed as corresponding author and can view all versions.

*Admin*

No content access.

**6. Resource Sharing Marketplace (GPU / CPU / Dataset)**

**Feature details:** Post available hardware, rent GPU/CPU, contact
owner, booking system, secure payment, buy datasets and raw data.

**What must exist**

Listing entity --- Hardware: GPU/CPU model, VRAM, RAM, storage, OS,
location, availability calendar, hourly/daily price, access method
(SSH/remote desktop), owner rating.

Listing entity --- Data: dataset title, domain, size, format, licence,
sample preview, one-time price or free.

Search + filter (price, GPU model, availability window, location).

Booking: request → owner accepts → time slot locked → payment held in
escrow → access details released → completion → auto-release of funds.

Payment: sandbox gateway (Stripe/SSLCOMMERZ), invoice, transaction
history, platform commission.

Rating & review after each completed booking; dispute button.

In-app chat with the owner (Contact Owner).

**Role-wise** **behaviour**

*Researcher & Supervisor (identical rights here --- both are community
members)*

Can act as **Provider**: post a listing, set price and availability,
accept/reject booking requests, receive payouts.

Can act as **Consumer**: browse, book, pay, download dataset(free+ if
paid then have to pay), rate the provider.

Supervisor variant: may post **lab-owned** resources under an
institution badge and, optionally, mark a listing \"free for students of
the institution where he works\".

*Admin*

Approves or rejects new listings (anti-fraud), verifies provider
identity, sets platform commission %.

Handles disputes and refunds, freezes suspicious transactions, delists
violating items.

Sees the full transaction ledger. Cannot book or sell (conflict of
interest).

**7. Discussion Forum & Research Community**

**Feature details:** User profiles with posts, knowledge sharing, ask &
answer questions, direct real-time messaging to every user they want to
message(supervisor, researcher etc), tags, upvotes, best answer.

**What must exist**

Question/Post entity: title, body (markdown + code + image), tags,
attachments.

Answers with upvote/downvote, accepted-answer marking by the asker,
comment threads.

Reputation/points system; badges (e.g., \"Helpful Reviewer\", \"Dataset
Contributor\").

Search across posts; follow tags; feed of your fields of interest.

Direct messaging with block & report.

Report button on every post → moderation queue.

**Role-wise** **behaviour**

*Researcher*

Ask, answer, comment, vote, accept an answer to their own question, DM
others, edit/delete their own content, build reputation shown on their
profile.

*Supervisor*

Same rights, plus a verified **\"Supervisor / Faculty\"** badge on the
profile so answers carry weight.

Can mark an answer as \"Expert Verified\" inside their own field
(optional trust feature).

Can pin an announcement inside their own project group discussion.

*Admin*

Moderation console: review reports, hide/delete any post, lock a thread,
issue warnings, temporarily mute or permanently ban a user.

Manages the tag taxonomy and community guidelines.

Cannot read private DMs --- only metadata (sender, receiver, timestamp)
and only for a reported conversation.

**8. AI Research Assistant (cross-cutting)**

**Feature details:** Paper summarization, research gap extraction,
semantic search across your own library and notes, citation-purpose
suggestion, writing help, experiment insight.

**What must exist**

Text extraction pipeline (PDF → chunks → embeddings stored in PostgreSQL
with pgvector).

Summarise paper (short / detailed / method-focused).

Auto-suggest values for the sidebar fields (gap, limitation, future
work, methodology) --- always editable by the human, never auto-saved
silently.

Semantic search: \"which paper used a corrosion dataset with more than
500 samples?\" answered from the user\'s own library.

Writing assistance: paraphrase, grammar, section outline suggestion.
Explicit \"AI-assisted\" flag stored for transparency.

**Role-wise** **behaviour**

**Researcher:** Full use within their own quota and only over data they
can already access (their library, their experiments, project shared
library). AI never crosses into another user\'s private data.

**Supervisor:** Same features, plus a \"Summarise my student\'s
progress\" report (tasks approved, experiments run, papers read this
month) generated from project data.

**Admin:** Does not use the research AI. Configures the provider
(OpenAI/Gemini), API keys, monthly token quota per role, blocked-prompt
policy, and views cost/usage analytics.

**9. Notifications, Search & Dashboard (support layer)**

**Global search bar:** searches across projects, tasks, papers,
experiments, manuscripts, forum --- scoped strictly by what the
logged-in role may access.

**Notification** **centre:** task assigned, revision requested, review
deadline, booking request, forum reply, milestone due.

**Dashboards:**

Researcher: my tasks today, upcoming deadlines, reading queue, latest
experiment, open review comments.

Supervisor: students overview, pending approvals count, pending reviews,
project progress bars, overdue items.

Admin: users by role, pending supervisor verifications, storag,
transactions, moderation queue, error logs.

**10. Suggested Build Order (for your SE course timeline)**

  ------- --------------------------------------------------------------------
  Phase   Deliverable
  1       Auth + RBAC + profiles + role dashboards (skeleton)
  2       Research Workspace: projects, milestones, tasks, approval workflow
  3       Literature Manager + Smart Research Sidebar
  4       Experiment Tracker + compare/lineage
  5       Writing & Review + citation purpose
  6       Forum + profiles + DM
  7       Marketplace + booking + sandbox payment
  8       AI Assistant layer over Phases 3--5
  9       Admin console, analytics, QA & testing
  ------- --------------------------------------------------------------------

**Out of scope (as declared):** full Overleaf replacement, full GitHub
replacement, grant management, real-time collaborative editing, native
mobile app, enterprise deployment.
