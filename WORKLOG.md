# ResearchOS — Detailed Work & Progress Log

> **Location:** Root Directory (`/WORKLOG.md`)  
> **Status:** Actively Maintained  
> **Last Updated:** 2026-08-16  

This document serves as the single source of truth for all completed engineering work, architectural decisions, database migrations, backend services, frontend interfaces, and specifications implemented across the ResearchOS monorepo.

---

## 📑 Table of Contents

1. [Project Overview & Architecture Summary](#1-project-overview--architecture-summary)
2. [Completed Modules & Milestones](#2-completed-modules--milestones)
   - [Milestone 0: Foundation & Monorepo Setup (Spec 00)](#milestone-0-foundation--monorepo-setup-spec-00)
   - [Milestone 1: Auth, RBAC & User Profiles (Spec 01)](#milestone-1-auth-rbac--user-profiles-spec-01)
   - [Milestone 2: System Specifications & Documentation](#milestone-2-system-specifications--documentation)
   - [Milestone 3: Research Workspace & Project Management (Spec 02)](#milestone-3-research-workspace--project-management-spec-02)
   - [Milestone 4: Literature Review & Paper Management (Spec 03)](#milestone-4-literature-review--paper-management-spec-03)
   - [Milestone 5: Experiment Tracker (Spec 04)](#milestone-5-experiment-tracker-spec-04)
   - [Milestone 6: Discussion Forum & Research Community (Spec 06)](#milestone-6-discussion-forum--research-community-spec-06)
3. [Component Breakdown](#3-component-breakdown)
   - [Database & Supabase Migrations](#database--supabase-migrations)
   - [Shared Types Package (`packages/shared-types`)](#shared-types-package-packagesshared-types)
   - [Express Backend API (`apps/api`)](#express-backend-api-appsapi)
   - [Frontend Web Application (`apps/web`)](#frontend-web-application-appsweb)
   - [Design System & UI/UX Assets](#design-system--uiux-assets)
4. [Testing, Security & Verification](#4-testing-security--verification)
5. [Current Status & Next Modules](#5-current-status--next-modules)

---

## 1. Project Overview & Architecture Summary

ResearchOS is an end-to-end research lifecycle and collaboration platform structured as a TypeScript monorepo managed with `pnpm` workspaces:

* **Frontend (`apps/web`)**: React 18 + Vite + TypeScript, Tailwind CSS, shadcn/ui patterns, Lucide icons, TanStack Query, React Router v6.
* **Backend API (`apps/api`)**: Node.js + Express + TypeScript, Helmet, CORS, Rate Limiting, JWKS JWT authentication.
* **Database & Auth (`supabase/`)**: Supabase Postgres with `pgvector`, Row Level Security (RLS) policies, database triggers, and Supabase Auth.
* **Shared Libraries (`packages/shared-types`)**: Centralized TypeScript types, enums, DTOs, and interface contracts shared between client and server.

---

## 2. Completed Modules & Milestones

### Milestone 0: Foundation & Monorepo Setup (Spec 00)
* **Monorepo Architecture**:
  * Configured `pnpm-workspace.yaml` for `apps/*` and `packages/*`.
  * Configured shared root TypeScript base configs, strict type checking, and `.npmrc`.
  * Set up unified scripts for `dev`, `build`, `test`, `lint`, and type checking across all workspaces.
* **Supabase Local & Remote Configuration**:
  * Configured `supabase/config.toml` (API, Auth, DB, Studio settings).
  * Implemented first migration: `supabase/migrations/20260814000000_enable_pgvector.sql` enabling the `vector` extension.
* **CI/CD Pipeline**:
  * Configured GitHub Actions workflow (`.github/workflows/ci.yml`) for automated linting, type-checking, building, and unit testing across packages.

---

### Milestone 1: Auth, RBAC & User Profiles (Spec 01)
* **Database Schema & Migrations (`20260815000000_auth_and_profiles.sql`)**:
  * **Enums**: `user_role` (`Admin`, `Supervisor`, `Researcher`), `user_status` (`Active`, `PendingVerification`, `Suspended`), `verification_status` (`Pending`, `Approved`, `Rejected`).
  * **Tables**:
    * `profiles`: User information, institutional affiliation, department, research interests/tags, ORCID/Scholar links, reputation points.
    * `supervisor_verification_requests`: Document verification workflow for Supervisor promotions.
    * `audit_logs`: Immutable logging for security, role modifications, status changes, and administrative actions.
  * **Database Functions & Triggers**:
    * `handle_new_user()` trigger: Automatically provisions a `profiles` row upon Supabase `auth.users` registration with default role `Researcher` and status `Active`.
    * `update_updated_at_column()` trigger: Maintains accurate timestamps on profile edits.
  * **Row Level Security (RLS)**:
    * Public read permissions for active user profiles.
    * Authenticated user self-management for profile updates.
    * Strict access controls on verification requests and audit logs.
  * **Seed Data (`supabase/seed.sql`)**:
    * Seeded initial test accounts across Admin, Supervisor, and Researcher roles with realistic academic profiles.

* **Backend Services, Middleware & Endpoints (`apps/api`)**:
  * **Auth & RBAC Middleware (`apps/api/src/middleware/auth.ts`)**:
    * Supabase JWT verification with cached JWKS public keys.
    * Token extraction, validation of user account status (`Active` vs. `PendingVerification` vs. `Suspended`), and dynamic user role resolution from live `profiles`.
  * **Profile Routes (`/api/v1/profiles`)**:
    * `GET /me`: Fetches current authenticated user profile.
    * `PATCH /me`: Validates and updates user bio, research interests, skills, institutional data, and external links.
    * `GET /:id`: Retrieves public researcher profile with active status check.
  * **Supervisor Verification Routes (`/api/v1/supervisor`)**:
    * `POST /verify`: Submits academic credentials and institutional email domain for supervisor status review.
    * `GET /status`: Checks current review status of verification request.
  * **Admin Console Routes (`/api/v1/admin`)**:
    * `GET /users`: Paginated user list with role/status filters and search.
    * `PATCH /users/:id/role`: Privilege-checked role elevation/demotion with automated audit logging.
    * `PATCH /users/:id/status`: Account activation/suspension with audit logging.
    * `GET /verifications`: Lists pending supervisor requests.
    * `POST /verifications/:id/review`: Approve or reject supervisor credentials (approvals automatically upgrade role to `Supervisor`).
    * `GET /audit-logs`: Paginated, filterable system audit trail.
  * **Audit Service (`apps/api/src/services/audit.service.ts`)**:
    * Centralized audit logging helper recording actor, action, target entity, IP address, and metadata.

* **Frontend Authentication & Dashboards (`apps/web`)**:
  * **Auth Context & State Management (`apps/web/src/context/AuthContext.tsx`)**:
    * Full integration with Supabase Auth session listeners (`SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`).
    * Direct synchronization of live application role and account status from the Express backend API.
  * **Authentication Pages (`apps/web/src/pages/auth/`)**:
    * `LoginPage.tsx`: Email/Password login, OAuth (Google/GitHub/ORCID ready), demo account quick-login, password recovery link.
    * `RegisterPage.tsx`: Account creation with institutional domain recognition and role selection.
    * `ForgotPasswordPage.tsx` & `ResetPasswordPage.tsx`: Secure password reset workflow.
    * `PendingVerificationPage.tsx`: Informative holding page for accounts pending admin verification.
  * **Role-Based Routing (`apps/web/src/pages/dashboards/DashboardRouter.tsx`)**:
    * Intelligent dashboard redirection based on verified role (`/dashboard/admin`, `/dashboard/supervisor`, `/dashboard/researcher`).
  * **Dashboard Implementations (`apps/web/src/pages/dashboards/`)**:
    * `ResearcherWorkspacePage.tsx`: Project overview, active tasks, publications, bookmarks, recent activity, and profile shortcuts.
    * `SupervisorDashboardPage.tsx`: Supervised projects, student team management, pending milestone reviews, manuscript feedback queues.
    * `AdminConsolePage.tsx`: Full administrative management suite:
      * User management table with live search, role/status dropdown modifiers.
      * Supervisor verification approval/rejection modal dialogs.
      * Real-time audit log viewer with metadata inspection.
      * Platform health and system metrics.
    * `ProfilePage.tsx`: Comprehensive profile view and editor for academic bio, research tags, ORCID ID, Google Scholar URL, and skills.

---

### Milestone 2: System Specifications & Documentation
Completed formal specification documents under `docs/specs/`:
1. `00-foundation.md` — Monorepo setup, environment variables, CI/CD, and core infrastructure.
2. `01-auth-rbac.md` — Authentication, RBAC, profiles, supervisor verification, and audit logging.
3. `02-research-workspace.md` — Projects, hierarchical tasks, milestones, and Kanban boards (Synchronized & contradictions resolved).
4. `03-literature-manager.md` — Paper repository, PDF reader, annotations, BibTeX parsing, and citation graphs.
5. `04-experiment-tracker.md` — Experiments, runs, parameters, metrics, artifact storage, and reproducibility logs.
6. `05-writing-review.md` — Collaborative manuscript editor, versioning, supervisor review workflow, and comments.
7. `06-forum-community.md` — Q&A forum, discussions, tags, voting, accepted answers, and reputation engine.
8. `07-marketplace.md` — Research services, compute/equipment listings, booking workflow, and escrow tracking.
9. `08-ai-assistant.md` — Literature summarizer, experiment co-pilot, writing assistant, RAG with `pgvector`.
10. `09-admin-analytics-qa.md` — Global admin telemetry, performance monitoring, moderation, and automated QA suites.
11. `README.md` — Specification index, dependency graph, and implementation order.

**Documentation Synchronization & Contradiction Resolution (2026-08-15):**
* Cross-referenced `docs/specs/02-research-workspace.md`, `docs/data-model.md`, and `docs/feature-plan.md`.
* Resolved `Project.ownerId` entity definition to strictly store creator's `userId` across personal (`isPersonal=true`) and supervised (`isPersonal=false`) projects.
* Clarified `ProjectMember.projectRole` enum is strictly `Member | CoSupervisor`. "Reviewer" is the manuscript review duty of that assigned CoSupervisor in Module 05, not a project role.
* Clarified that only the Project Owner Supervisor holds Module 02 project-governance authority (CoSupervisor does not have automatic project governance).
* Added explicit proposal approval endpoints (`POST /tasks/:id/approve-proposal` & `POST /milestones/:id/approve-proposal`).
* Defined calendar/deadline scope in Module 02 based on `Task.dueDate` and `Milestone.targetDate` (meeting slots deferred).
* Defined explicit defense-in-depth Realtime RLS policies for `project_messages` and `notifications`.
* Clarified progress calculation formula with weighted milestone support and unweighted fallback.
* Unified task attachment referencing via `progressNote` / Supabase Storage links and `TaskComment` threads.

Core Architectural & Implementation Documents:
* `docs/plans/02-research-workspace-plan.md` — Phased 7-part implementation plan for Module 02 (Research Workspace).
* `docs/feature-plan.md` — Comprehensive breakdown of features, roles, and user flows.
* `docs/data-model.md` — Complete database schema, tables, relationships, and RLS policies.
* `docs/build-plan.md` — Step-by-step phased engineering roadmap.
* `AGENTS.md` — 15 strict architectural, security, RBAC, and engineering rules.

---

### Milestone 3: Research Workspace & Project Management (Spec 02)
* **Database Schema & Migrations (`20260816000000_research_workspace.sql` & `20260817000000_project_invite_roles.sql`)**:
  * **Enums**: `project_status`, `project_member_role`, `milestone_status`, `proposal_status`, `task_status`, `task_priority`, `notification_type`, `invited_role`.
  * **Tables (8 tables)**:
    * `projects`: Supervised & personal research workspaces with title, abstract, domain tags, progress calculation, and budget tracking.
    * `project_members`: Project membership table with `Member` and `CoSupervisor` roles and owner role promotion/demotion support.
    * `project_invites`: Single-use invite codes with `invited_role` support, usage limits, expiration timestamps, and revocation support.
    * `milestones`: Deliverable milestones with weight percentages (sum $\le 100\%$), sequencing, proposal status, and locking controls.
    * `tasks`: Full deliverable tracking with state machine (`ToDo` $\leftrightarrow$ `InProgress` $\rightarrow$ `Submitted` $\rightarrow$ `Approved` / `RevisionRequested`), assignee references, deliverable URLs, and researcher proposals.
    * `task_comments`: Discussion threads on individual tasks.
    * `project_messages`: Project team group messaging with Realtime publication support.
    * `notifications`: In-app notification delivery for task assignments, reviews, approvals, milestone alerts, and invites.
  * **Database Functions & Triggers**:
    * `recalculate_project_progress()`: Automatically computes project progress % weighted across approved milestone tasks.
    * Realtime publication added for `project_messages` and `notifications`.
  * **Row Level Security (RLS)**:
    * Complete isolation for non-members across all project tables.

* **Backend Services, Middleware & Endpoints (`apps/api`)**:
  * **Workspace Security Middleware (`apps/api/src/middleware/workspaceGuards.ts`)**:
    * Authenticated user status check, project membership guard, Project Owner Supervisor governance check, and milestone locking guard.
  * **Project & Membership Services (`apps/api/src/services/`)**:
    * `project.service.ts`: Personal vs supervised project creation rules, metadata editing, project membership listings, member role updates (`PATCH /projects/:id/members/:userId`), profile autocomplete search (`GET /profiles/search?q=...`).
    * `invite.service.ts`: Single-use invite code generation with `invitedRole` (`Member` vs `CoSupervisor`), invite revocation (`POST /projects/:id/invites/:inviteId/revoke`), and role assignment on accept (`POST /invites/:code/accept`).
    * `milestone.service.ts`: Milestone creation, weight validation, researcher proposals, proposal approval, and locking toggles.
    * `task.service.ts`: Strict state machine transitions, proposal activation, deliverable submission, supervisor approval / revision request feedback loop, and task discussion comments.
    * `message.service.ts`: Project team chat streaming with Realtime support.
    * `notification.service.ts`: Notification dispatch (`TaskAssigned`, `TaskApproved`, `RevisionRequested`, `DeadlineIn48h`, `MilestoneDue`, `ReviewDeadline`), user notification listing (`GET /notifications`), unread badge count (`GET /notifications/unread-count`), single read update (`PATCH /notifications/:id/read`), and bulk read (`POST /notifications/read-all`).

* **Frontend Workspace & Navigation UI (`apps/web`)**:
  * **Layout & Navigation (`apps/web/src/components/layout/`)**:
    * `AppSidebar.tsx`: Hover-expandable sidebar (icon-only `w-[72px]` $\rightarrow$ expands smoothly to `w-64` on cursor hover without clicks).
    * `TopHeader.tsx`: Active project switcher with cosmic neon glow, rotating $180^\circ$ chevron, shimmer sweep, active checkmarks, role-based action triggers, and integrated `NotificationBell`.
    * `NotificationBell.tsx`: Live unread count badge, cosmic popover (`popover-neon-surface`), `All` / `Unread` filter tabs, mark-all-read action, single-click mark-as-read with project navigation, and live Supabase Realtime synchronization.
    * `WorkspaceLayout.tsx`: Coordinated main content container adjusting left margin dynamically with sidebar hover states.
  * **Workspace Views & Modals (`apps/web/src/components/workspace/` & `apps/web/src/pages/dashboards/`)**:
    * `NotificationsPage.tsx`: Dedicated full-featured Notification Center at `/notifications` with search query filtering, category pills (`All`, `Unread`, `Tasks`, `Reviews & Approvals`, `Deadlines`), bulk actions, and direct workspace navigation.
    * `ResearcherWorkspacePage.tsx` & `SupervisorDashboardPage.tsx`: Role-specific Dashboard Home hubs featuring project card grids with progress indicators, quick metric cards (Projects, Tasks, Completed, Students), upcoming deadline tracking, empty-state workspace creation CTAs, and top-banner **Join Project** quick actions.
    * `ProjectMembersModal.tsx`: 3-tab team collaboration modal (Active Team with role modifier, Direct User Invite with profile search autocomplete, and Shareable Join Codes/Links with revocation actions).
    * `JoinProjectModal.tsx`: Streamlined modal for joining research workspaces via 6-character invite codes.
    * `KanbanBoard.tsx`: Interactive Kanban board across 6 status columns with standardized 38px static toolbar height, search input, task cards, and supervisor review modals.
    * `WorkspaceCalendar.tsx`: Roadmap and scheduled deadline tracking.
    * `TaskDetailModal.tsx`: Task inspector with deliverable submission and live comment thread.
    * `SupervisorReviewModal.tsx`: Supervisor deliverable review workflow with mandatory feedback note.
    * `MilestoneTimeline.tsx`: Milestone progress tracking, sequence order, weight contribution, and locking controls.
    * `ProjectChatDrawer.tsx`: Realtime project team chat stream.
    * `NewTaskModal.tsx` & `NewMilestoneModal.tsx`: Direct creation (Supervisors/Personal) and Proposal workflows (Researchers).
    * `UserAvatar.tsx`: Reusable profile avatar component with dynamic image loading, `onError` fallback, and role-gradient initial letters.
    * `ExitWorkspaceModal.tsx`: Session exit confirmation dialog intercepting browser back button navigation from the workspace.
    * `HoverSelect.tsx`: Reusable global select/filter component with static $38\text{px}$ trigger height, 180° animated chevrons, anti-flicker gap bridges, debounced leave timers, and keyboard accessibility.

---

### Milestone 4: Literature Review & Paper Management (Spec 03)
* **Database Schema & Migrations (`supabase/migrations/`)**:
  * `20260903000000_literature_manager.sql`:
    * **Enums**: `reading_status` (`Unread`, `Reading`, `Read`, `DeeplyAnalysed`), `citation_purpose_type` (`Motivation`, `MethodSource`, `DatasetSource`, `ComparisonBaseline`, `ContradictingEvidence`, `SupportingEvidence`, `RelatedWork`), `sidebar_field_type` (`ResearchGap`, `Methodology`, `Results`, `Limitation`, `FutureWork`, `DatasetUsed`), `metadata_source` (`crossref`, `openalex`, `pdf_extraction`, `user`).
    * **Tables (8 tables)**:
      * `file_assets`: Cross-module Supabase storage metadata tracking (`owner_id`, `storage_path`, `file_name`, `mime_type`, `size_bytes`).
      * `papers`: Core literature entity with bibliographic metadata, normalized DOI unique index, `file_asset_id` cascade, bidirectional reading status, project sharing, supervisor required reading, and full-text `tsvector` GIN index.
      * `paper_sidebar_fields`: Structured research synthesis (`research_gap`, `methodology`, `results`, `limitation`, `future_work`, `dataset_used`, `personal_notes`, `personal_notes_visible`). Auto-instantiated via database trigger on paper creation.
      * `paper_sidebar_fields_view`: **Option A Dynamic Privacy Masking View** (`security_invoker = true`) which securely masks `personal_notes = NULL` when `personal_notes_visible = false` and the viewer is not the uploader.
      * `paper_annotations`: Scale-invariant highlight overlays with normalized percentage coordinates (`position_data`), sticky notes, and linked sidebar fields.
      * `collections`: Personal research collections with name, color hex, and dynamic paper count aggregation.
      * `paper_collections`: Many-to-many junction table isolating collection deletions from paper records.
      * `citation_purposes`: Typed citation role categorization with optional context notes.
      * `paper_comments`: Collaborative discussion threads on shared project publications.
  * `20260903000001_papers_storage_policies.sql`:
    * Row-level security on Supabase `storage.objects` for private bucket `papers`, restricting uploads, downloads, and deletions strictly to `{userId}/{uuid}.pdf`.
  * `20260903000002_fix_rls_circular_recursion.sql`:
    * Created `is_project_member` and `is_project_owner` `SECURITY DEFINER` helper functions to eliminate mutual RLS recursion between `projects`, `project_members`, and `papers`.

* **Backend Services, Middleware & Endpoints (`apps/api`)**:
  * **Middleware Guards (`apps/api/src/middleware/paperGuards.ts`)**:
    * Authenticated user check, AC-18 Admin privacy protection (`403 Forbidden`), paper access guard (uploader or shared project member), paper uploader-only guard, and project supervisor guard.
  * **Storage & FileAsset Service (`apps/api/src/services/fileAsset.service.ts`)**:
    * Controlled storage path validation (`{userId}/{uuid}.pdf`), 50MB PDF validation, pre-signed download URLs, and storage orphan cleanup rollback on failed transactions.
  * **Metadata Provider Architecture (`apps/api/src/services/metadata/`)**:
    * Pluggable provider system with `crossref.provider.ts` and `openalex.provider.ts` leveraging polite mailto headers.
    * PDF text DOI extraction (`pdfExtraction.service.ts`) and weighted candidate matching confidence scoring (`metadata.service.ts`).
    * `POST /metadata/resolve`: Scans uploaded PDF, extracts DOI or search queries, and returns resolved candidate metadata before paper creation.
  * **Paper CRUD & Sharing (`apps/api/src/services/paper.service.ts`)**:
    * Paper creation with duplicate DOI check (`409 Conflict`), bidirectional reading status updates, project sharing, supervisor required reading assignment with linked workspace tasks, full-text tsvector search (`GET /papers?q=...`), and cascade deletion.
  * **Smart Sidebar & Annotations (`apps/api/src/services/`)**:
    * `sidebar.service.ts`: Option A dynamic masking queries; uploader-only personal notes protection.
    * `annotation.service.ts`: Zoom-invariant normalized percentage coordinates and collaborative visibility.
    * `comment.service.ts`: Discussion comments on shared papers.
    * `collection.service.ts`: Collection management with dynamic `paperCount` aggregation and deletion cascade isolation.
    * `citationPurpose.service.ts`: Categorized citation roles.
    * `export.service.ts`: Deterministic BibTeX (`@article{...}`) and standard RIS export generation.

* **Frontend Literature & Reader UI (`apps/web`)**:
  * **Library Hub (`apps/web/src/pages/dashboards/LibraryPage.tsx`)**:
    * Two-pane scholarly view with `CollectionSidebar` and responsive paper grid.
    * "My Library" vs "Project Library" view tabs, debounced metadata search, reading status filter, year filter, and BibTeX/RIS export download trigger.
  * **Upload & Management Modals (`apps/web/src/components/literature/`)**:
    * `UploadPaperModal.tsx`: Multi-step upload flow with direct Supabase Storage upload, automated CrossRef & OpenAlex metadata resolution, candidate review, and duplicate DOI conflict resolution.
    * `PaperCard.tsx`: Scholarly publication card with formatted authors, year, venue, working external DOI links, bidirectional reading status dropdown pill, and required reading indicator.
    * `CollectionSidebar.tsx`: "All Papers" & "Required Reading" quick filters, collection swatches, and inline collection manager.
    * `PaperMetadataModal.tsx` & `SharePaperModal.tsx`: Bibliographic editor and project sharing modal.
  * **In-Browser PDF Reader & Smart Sidebar (`apps/web/src/pages/dashboards/PaperViewerPage.tsx`)**:
    * `PdfViewer.tsx`: Modular `react-pdf` viewer with page navigation, zoom controls, and scale-invariant highlight overlays rendered using CSS percentage coordinates (`0.0–1.0`).
    * `HighlightPopover.tsx`: Selection popover capturing normalized coordinates, notes, and links to research analysis fields.
    * `AnnotationList.tsx`: Collapsible left panel with search and one-click page jumping.
    * `SmartResearchSidebar.tsx`: Four-tab analysis panel (Structured Synthesis, Option A Personal Notes with privacy toggle/lock banner, Citation Roles, and Discussion Comments).
  * **Workspace Dashboard Integration**:
    * Added "Literature & Reading Queue" cards in `ResearcherWorkspacePage.tsx` and `SupervisorDashboardPage.tsx`.

---

### Milestone 5: Experiment Tracker (Spec 04)
* **Database Schema & Migrations (`20260904000000_experiment_tracker.sql` & `20260904000001_experiments_storage_policies.sql`)**:
  * **Enums**: `experiment_purpose` (`ModelTesting`, `HyperparameterTuning`, `DatasetComparison`, `PerformanceEvaluation`, `Baseline`, `Final`), `experiment_status` (`Draft`, `Final`), `experiment_flag_type` (`NeedsRerun`, `NotReproducible`).
  * **Tables**:
    * `experiments`: Primary entity storing scientific hypothesis, purpose, JSONB typed `config` (model architecture, hyperparameters, dataset, hardware, codeCommit, environmentNotes), JSONB `metrics` (loss, accuracy, F1, latency, throughput), `output_file_ids` array, `observation`, and immutable `status` (`Draft` vs `Final`).
    * `experiment_flags`: Supervisor review governance storing issue type (`NeedsRerun`, `NotReproducible`), supervisor guidance note, optional auto-generated revision task ID (`raised_task_id`), and resolution timestamp & note.
    * `task_experiment_links`: Many-to-many junction table bridging workspace tasks with experimental execution runs.
    * `experiment_comments`: Real-time collaborative discussion thread on individual experiments.
  * **Defense-in-Depth Database Triggers**:
    * `on_experiment_prevent_final_update`: PostgreSQL trigger rejecting any `UPDATE` on finalized experiments (`status = 'Final'`) with an exception, guaranteeing tamper-proof scientific records.
    * `on_experiment_prevent_final_delete`: PostgreSQL trigger rejecting any `DELETE` on finalized experiments.
    * `on_experiments_updated_at`: Automated timestamp sync on record modification.
  * **Storage Bucket & Policies (`experiments`)**:
    * Private Supabase Storage bucket `'experiments'` configured with authenticated RLS policies isolating outputs to project members.
* **Shared Types & Contracts (`packages/shared-types`)**:
  * Types: `ExperimentPurpose`, `ExperimentStatus`, `ExperimentFlagType`, `ExperimentConfig`, `ExperimentMetrics`, `Experiment`, `ExperimentFlag`, `TaskExperimentLink`, `ExperimentComment`.
  * Comparison models: `AlignedParameterRow`, `AlignedMetricRow`, `ExperimentComparisonResponse`.
  * DTOs: `CreateExperimentDto`, `UpdateExperimentDto`, `CreateExperimentFlagDto`, `ResolveExperimentFlagDto`, `AddExperimentCommentDto`, `LinkTaskExperimentDto`, `ExperimentSearchParams`.
  * Notification types extended with `ExperimentFlagged` and `ExperimentCommented`.
* **Backend API Implementation (`apps/api`)**:
  * **Authorization Guards (`experimentGuards.ts`)**:
    * `requireExperimentViewer`: Enforces project membership / ownership and strictly blocks Admins (`403 Forbidden`) under AC-18 privacy rules.
    * `requireExperimentOwner`: Verifies the acting researcher owns the experiment for updates and deletions.
    * `requireDraftExperiment`: Rejects modifications to finalized experiments with `409 Conflict`.
    * `requireSupervisorForExperimentFlag`: Restricts flagging to verified project Supervisors.
  * **Services**:
    * `experiment.service.ts`: Complete CRUD, pagination, filtering by purpose and status, irreversible finalization, task linking, and 2–5 multi-run comparison engine.
    * `experimentFlag.service.ts`: Supervisor review flagging with automatic high-priority revision task creation in the workspace.
    * `experimentComment.service.ts`: Collaborative discussion thread manager.
  * **Comparison Engine (`/experiments/compare?ids=...`)**:
    * Aligns hyperparameters across 2–5 runs, flags differing parameters (`isIdentical = false`), ranks numeric metrics, identifies optimal performers (`bestExperimentId`), and aggregates consistency metrics.
  * **Router (`experiment.routes.ts`)**:
    * Fully mapped and mounted at `/projects/:projectId/experiments` and `/experiments`.
* **Frontend Web Application (`apps/web`)**:
  * **Navigation & Routing**:
    * Mounted `/experiments` route in `App.tsx` and sidebar navigation item in `AppSidebar.tsx` under "Research Engine".
  * **Experiment Tracker Dashboard (`apps/web/src/pages/dashboards/ExperimentTrackerPage.tsx`)**:
    * Project switcher with live workspace scope.
    * Real-time metrics ribbon: Total Runs, In-Progress Drafts, Finalized Baselines, and Flagged for Rerun.
    * Debounced search bar, status dropdown, and 7 purpose filter pills (`All`, `Baseline`, `Model Testing`, `Hyperparameter Tuning`, `Dataset Comparison`, `Performance Eval`, `Final`).
    * Responsive card grid with selection checkboxes for compare mode.
    * Floating compare action bar with selection count and single-click matrix trigger.
    * AC-18 Admin Privacy Gate: Dedicated institutional compliance banner blocking raw data inspection for administrative roles.
  * **Interactive Component Suite (`apps/web/src/components/experiments/`)**:
    * `ExperimentCard.tsx`: Purpose badge styling, finalized lock indicators, config summaries, top metrics pills, unresolved flag warnings, and comparison selection checkbox.
    * `CreateExperimentModal.tsx`: Run authoring dialog with dynamic key-value hyperparameter and metric tables, architecture presets, and draft vs finalized lock options.
    * `ExperimentDetailModal.tsx`: Run inspector drawer with 4 tabs: Configuration & Hyperparameters, Metrics & Observations, Linked Tasks, and Flags & Discussion.
    * `SupervisorFlagModal.tsx`: Supervisor issue reporting with `NeedsRerun` / `NotReproducible` categories, guidance notes, and automated revision task creation.
    * `ExperimentComparisonModal.tsx`: Side-by-side sticky column comparison matrix with diff highlighting, metric ranking trophies, visual performance comparison bars, CSV spreadsheet export, and Markdown table copy.

---

### Milestone 6: Discussion Forum & Research Community (Spec 06)
* **Database Schema & Migrations (`20260905000000_forum_community.sql`)**:
  * **Enums**: `forum_target_type` (`Post`, `Answer`, `Comment`), `forum_vote_value` (`Like`, `Love`, `Insightful`, `Celebrate`, `Curious`, `Support`, `Up`, `Down`), `report_target_type` (`Post`, `Answer`, `Comment`, `DirectMessage`), `report_status` (`Pending`, `ActionTaken`, `Dismissed`).
  * **Core Tables**: `forum_posts`, `forum_answers`, `forum_comments`, `forum_votes`, `badges`, `user_badges`, `tag_follows`, `direct_messages`, `user_blocks`, `forum_reports`.
  * **Seed Badges**: First Question, First Answer, Solution Accepted, Expert Contributor, Top Scholar, Community Pillar.
  * **RLS & Security Rules**: Row-level policies for public forum reads, authenticated authors, strict two-party DM privacy, and blocklist enforcement.
* **Shared Type Contracts (`packages/shared-types`)**:
  * Added full type definitions, interfaces, request/response DTOs, and reaction count aggregates for posts, answers, comments, votes, badges, tag follows, DMs, blocks, and reports.
* **Backend Services & RBAC Guards (`apps/api/src/`)**:
  * `forumGuards.ts`: Post, answer, and comment author/admin mutation guards; Supervisor verification guard.
  * `forumPost.service.ts`: Threaded post lifecycle, tag filtering, pinned posts, status management, full-text search.
  * `forumAnswer.service.ts`: Answer submission, post author solution acceptance, and active Supervisor expert verification.
  * `forumVote.service.ts`: LinkedIn 6-reaction engine (`Like`, `Love`, `Insightful`, `Celebrate`, `Curious`, `Support`) + Q&A voting, self-reaction blocking, reputation ledger (+10 reaction/upvote, +15 accepted, +20 expert, -2 downvote).
  * `forumComment.service.ts`: Lightweight post and answer inline discussion comments.
  * `tagFollow.service.ts`: Research topic tag follow/unfollow and popular tag cloud.
  * `directMessage.service.ts`: AC-13 strictly private two-party direct messages, bidirectional block enforcement, thread aggregation.
  * `forumReport.service.ts`: Content reporting queue, admin actions, and AC-13 direct message body redaction (`[METADATA ONLY — PRIVATE DM PROTECTED BY AC-13]`).
  * `communityProfile.service.ts`: Reputation scoring, dynamic badge awarding, and community leaderboards.
* **Frontend Web Application (`apps/web/src/`)**:
  * `CommunityPage.tsx`: Academic Q&A and community feed dashboard (`/community`), search, tag filtering, reputation stats, and modal routers.
  * `PostCard.tsx`: Rich post card with tags, author metadata, reaction summaries, answer count, and solution indicator.
  * `ReactionPicker.tsx`: LinkedIn-style floating multi-reaction bar with animated emojis and reactor breakdown modal.
  * `ReactionDetailModal.tsx`: Multi-tabbed reactor inspector by reaction type.
  * `CreatePostModal.tsx`: Rich question and discussion creator with tag chips.
  * `PostDetailModal.tsx`: Thread viewer with inline comments, solution acceptance button, and Supervisor expert verification seal.
  * `DirectMessagesPanel.tsx`: Two-pane private chat drawer with participant search, block toggling, and real-time message sending.
  * `CommunityProfileModal.tsx`: User reputation, unlocked badges, post activity, and rank showcase.
  * `AdminModerationModal.tsx`: AC-13 compliant moderation queue for reviewing reported content and executing admin actions.

---

### Milestone 7: AI Research Assistant (Module 08)
* **Database Schema & Migrations (`20261001000000_ai_assistant.sql`, `20261001000001_manuscript_section_ai_flag.sql`)**:
  * **Enums**: `ai_provider` (`OpenAI`, `Gemini`, `Anthropic`, `Mock`), `embedding_source_type` (`Paper`, `PaperSidebarFields`, `ManuscriptSection`), `ai_suggestion_target_type` (`PaperSidebarFields`, `ManuscriptSection`), `ai_suggestion_status` (`Pending`, `Accepted`, `Rejected`).
  * **Core Tables**:
    * `ai_provider_configs`: Single active provider configuration storing API key env reference (no plain secrets).
    * `ai_quotas`: Role-based monthly token quotas (`Admin`, `Supervisor`, `Researcher`).
    * `blocked_prompt_rules`: Server-side content security filter preventing prompt injection and academic misconduct.
    * `ai_usage_logs`: Immutable per-request token and cost tracking ledger.
    * `ai_suggestions`: Human-in-the-loop suggestion store for structured paper sidebar fields and manuscript writing.
    * `embeddings`: 768-dimensional `vector(768)` vector storage with HNSW index for high-speed cosine similarity (`<=>`).
    * `progress_reports`: Automated weekly research progress reports for supervised projects.
    * Added `is_ai_assisted` boolean column to `manuscript_sections` for academic transparency.
  * **Database Functions**:
    * `match_embeddings`: pgvector cosine similarity search function with threshold and limit filtering.
* **Shared Types Package (`packages/shared-types`)**:
  * Added full type contracts: `AiProviderConfig`, `AiQuota`, `BlockedPromptRule`, `AiUsageLog`, `AiSuggestion`, `Embedding`, `ProgressReport`, request/response DTOs, and summarization/insight payloads.
* **Backend Services & API Layer (`apps/api/src/`)**:
  * **Provider Adapter**: Provider-agnostic interface (`AiProvider`) with concrete adapters for Google Gemini, OpenAI, Anthropic, and deterministic test Mock.
  * **Embedding Pipeline**: Automatic chunking and vector generation from uploaded PDF assets using `pdf-parse` and pgvector.
  * **Semantic Search Service**: Access-scoped literature search across personal and shared project boundaries.
  * **Summarization & Suggestion Service**: Multi-mode summarization (`Quick`, `Comprehensive`, `Critique`) and human-in-the-loop field suggestions.
  * **Writing Assistance Service**: Contextual text enhancement (`paraphrase`, `improve_grammar`, `suggest_outline`) and experiment insight generation.
  * **Progress Report Service**: Supervisor-scoped weekly synthesis of completed tasks, experiments, and active papers.
  * **Quota & Policy Enforcement**: Pre-execution verification of monthly token allowances and case-insensitive substring prompt filtering.
* **Frontend Web Application (`apps/web/src/`)**:
  * `AiUsageIndicator.tsx`: Real-time token consumption progress gauge with role-based budget tracking and threshold alerts.
  * `AiSuggestionCard.tsx`: Human-in-the-loop review card with diff visualization, confidence scores, and one-click Accept/Reject.
  * `AiSummarizePanel.tsx`: Mode selector (`Quick`, `Comprehensive`, `Critique`), copy-to-clipboard, and markdown preview.
  * `AiSuggestionsPanel.tsx`: Structured field suggestion generator for methodology, dataset, and key finding attributes.
  * `SemanticSearchPanel.tsx`: Dedicated semantic exploration drawer in LibraryPage with similarity score badges and one-click PDF navigation.
  * `AiWritingAssistModal.tsx`: Real-time writing enhancement modal with side-by-side diff previews, suggestion history, and transparency badge integration in `ManuscriptEditorPage.tsx` and `LatexPaperPreview.tsx`.
  * `AdminAiConfigPanel.tsx`: Full administrative control dashboard in `AdminConsolePage.tsx` covering provider selection, role token quotas, prompt firewall rules, and token/cost analytics.

---

## 3. Component Breakdown

| Component | Path | Status | Key Features |
| :--- | :--- | :--- | :--- |
| **Database Migrations** | `supabase/migrations/` | ✅ Complete (Spec 00-08) | `pgvector`, `profiles`, `projects`, `tasks`, `milestones`, `notifications`, `file_assets`, `papers`, `paper_sidebar_fields`, `collections`, `experiments`, `experiment_flags`, `forum_posts`, `forum_answers`, `forum_comments`, `forum_votes`, `badges`, `user_badges`, `tag_follows`, `direct_messages`, `user_blocks`, `forum_reports`, `manuscripts`, `manuscript_sections`, `ai_provider_configs`, `ai_quotas`, `blocked_prompt_rules`, `ai_usage_logs`, `ai_suggestions`, `embeddings`, `progress_reports`. |
| **Shared Types** | `packages/shared-types` | ✅ Complete (Spec 00-08) | Enums (`ReadingStatus`, `ExperimentPurpose`, `AiProvider`, `AiSuggestionStatus`), Entities (`Paper`, `Experiment`, `ForumPost`, `Manuscript`, `AiSuggestion`, `AiQuota`), DTOs, API contracts. |
| **Backend API** | `apps/api` | ✅ Complete (Spec 00-08) | Express server, JWKS JWT auth, RBAC & Privacy Guards, Paper & Experiment services, Forum Q&A, AI Provider Adapters (Gemini, OpenAI, Anthropic, Mock), pgvector Semantic Search, Quota Middleware, Prompt Firewall, Human-In-The-Loop Suggestions. (**162 automated integration & contract tests passing**). |
| **Frontend Web App** | `apps/web` | ✅ Complete (Spec 00-08) | React 18, Vite, Tailwind CSS, AppSidebar, TopHeader, Kanban Board, LibraryPage, PaperViewerPage, ExperimentTrackerPage, CommunityPage, ManuscriptEditorPage, SemanticSearchPanel, AiWritingAssistModal, AdminAiConfigPanel. |
| **Design System** | `design-system/` & `apps/web/src/components/` | ✅ Active | Deep obsidian theme (`#08090C` canvas, `#0E1118` surface, violet/amber accents), glassmorphism popovers, static control heights. |

---

## 4. Testing, Security & Verification

* **Authentication, RBAC & Privacy Enforcement**:
  * Role and account status verified on every API request.
  * Server-derived identity (`req.user.id`) prevents client identity spoofing.
  * AC-18 Admin Privacy Rule strictly enforced: Admins receive `403 Forbidden` on all paper data and raw experiment payloads.
  * AC-13 Direct Message Privacy Rule strictly enforced: Direct messages are strictly two-party private; admins cannot read message bodies even in reported moderation queues (metadata only).
  * Prompt Policy Firewall: Case-insensitive substring matching blocks injection prompts before LLM dispatch with zero token cost.
  * Human-In-The-Loop Lifecycle: Suggestions strictly require owner approval before mutating paper fields or manuscript sections; double-accept returns 409 Conflict.
  * Role Token Quota Enforcement: Exceeded monthly quotas return 429 Too Many Requests.
* **Automated Verification Results**:
  * **Backend API Suite**: **162/162 tests passing** (including 12/12 dedicated AI assistant integration tests).
  * **Frontend UI Suite**: **58/58 tests passing**.
  * **Monorepo Typecheck**: **0 errors across all workspace packages** (`pnpm -r typecheck`).
  * **Total Test Suite**: **220/220 tests passing** (`100% pass rate`).

---

## 5. Current Status & Next Modules

* **Completed**: 
  * Spec 00 (Monorepo Foundation & pgvector)
  * Spec 01 (Authentication, User Profiles, RBAC, Admin Console)
  * Spec 02 (Research Workspace, Task State Machine, Milestones, Team Invites, Chat & Realtime Notifications)
  * Spec 03 (Literature Review & Paper Management, Automated Metadata Extraction, PDF Reader, Smart Research Sidebar)
  * Spec 04 (Experiment Tracker, Reproducible Hyperparameters & Metric Logging, Scientific Immutability Triggers)
  * Spec 05 (Writing & Review, Manuscript Editor, Collaborative Peer Review, Review Assignments)
  * Spec 06 (Discussion Forum & Research Community, Academic Q&A, Multi-Reactions, AC-13 Private DMs, Reputation Ledger)
  * Spec 08 (AI Research Assistant, Semantic Search, Summarization, Writing Assistance, Human-In-The-Loop Suggestions, Admin Quotas & Firewall)
* **Next Up**: **Spec 07 — Collaborative Grants, Bookings & Academic Marketplace**

---
*This log will be continuously updated as new features, migrations, and modules are completed.*

