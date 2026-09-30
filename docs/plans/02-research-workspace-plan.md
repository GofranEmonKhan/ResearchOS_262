# Implementation Plan — Module 02: Research Workspace (Phased Execution)

> **Document:** Module 02 Implementation Plan  
> **Location:** `docs/plans/02-research-workspace-plan.md`  
> **Status:** Approved & Ready for Execution  
> **Reference Specs:** [docs/specs/02-research-workspace.md](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/docs/specs/02-research-workspace.md), [docs/data-model.md](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/docs/data-model.md), [AGENTS.md](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/AGENTS.md)

---

## 📑 Table of Contents
1. [Core Architectural & Governance Rules](#1-core-architectural--governance-rules)
2. [Sub-Feature Phasing Map](#2-sub-feature-phasing-map)
3. [Phase 2.1: Database Migration & Shared Contracts](#phase-21-database-migration--shared-contracts)
4. [Phase 2.2: Backend Projects, Membership & Invite Engine](#phase-22-backend-projects-membership--invite-engine)
5. [Phase 2.3: Backend Task State Machine, Milestones & Proposals](#phase-23-backend-task-state-machine-milestones--proposals)
6. [Phase 2.4: Backend Project Chat, Notifications & Realtime RLS](#phase-24-backend-project-chat-notifications--realtime-rls)
7. [Phase 2.5: Frontend Layout — Hover-Expandable Sidebar & Top Header](#phase-25-frontend-layout--hover-expandable-sidebar--top-header)
8. [Phase 2.6: Frontend Workspace Views — Kanban, Calendar & Modals](#phase-26-frontend-workspace-views--kanban-calendar--modals)
9. [Phase 2.7: End-to-End Verification & Documentation Update](#phase-27-end-to-end-verification--documentation-update)
10. [Verification Plan & Test Cases](#10-verification-plan--test-cases)

---

## 1. Core Architectural & Governance Rules

### Role & Governance Hierarchy
* **Application Roles**: Exactly three (`Admin`, `Supervisor`, `Researcher`).
* **Project Roles (`ProjectMember.projectRole`)**: Strictly `Member | CoSupervisor`.
* **Reviewer Duty**: "Reviewer" is **not** a `ProjectMember` role or entity; it is the manuscript review duty performed by that assigned `CoSupervisor` for a specific manuscript through `ReviewAssignment` in Module 05.
* **Exclusive Governance Authority**: In supervised projects, only the **Project Owner Supervisor** (`projects.owner_id`) holds Module 02 governance powers (adding/removing members, creating invites, defining/locking milestones, approving proposals, assigning tasks to other members, approving tasks, and requesting revisions). `CoSupervisor` is an assigned Supervisor participating in the project, without automatic governance authority in Module 02.
* **Researchers**: Can execute assigned tasks, submit deliverables with progress notes, propose milestones/tasks (`is_proposed = true`), and self-assign tasks only within their personal projects (`is_personal = true`). Any attempt by a Researcher to approve their own supervised task will return `403 Forbidden`.
* **Task & Milestone Proposals**: Researcher proposals (`is_proposed = true`) do not become active governance objects until explicitly approved by the Project Owner Supervisor via `POST /api/v1/tasks/:id/approve-proposal` and `POST /api/v1/milestones/:id/approve-proposal`.
* **Admins**: Have aggregate-only visibility (counts, storage, active status) and cannot inspect private research content or chat messages.

### Realtime & Defense-in-Depth RLS
Project messages (`project_messages`) and Notifications (`notifications`) use Supabase Realtime (Postgres Changes) with defense-in-depth `SELECT`/`UPDATE` RLS policies:
* `project_messages`: `SELECT` allowed only for project owner (`projects.owner_id = auth.uid()`) OR active project members (`project_members.user_id = auth.uid()`).
* `notifications`: `SELECT` & `UPDATE` allowed only where `auth.uid() = user_id`.
* All business writes remain strictly Express-authorized using the server secret key.

---

## 2. Sub-Feature Phasing Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Phase 2.1: Database Migration & Shared Contracts                            │
│  └─ 8 tables, indexes, constraints, RLS policies, Realtime publication, DTOs│
├─────────────────────────────────────────────────────────────────────────────┤
│ Phase 2.2: Backend Projects, Membership & Invite Engine                     │
│  └─ Project CRUD, personal vs supervised rules, invite codes, progress engine│
├─────────────────────────────────────────────────────────────────────────────┤
│ Phase 2.3: Backend Task State Machine, Milestones & Proposal Workflows      │
│  └─ ToDo->InProgress->Submitted->UnderReview->Approved/Revision, proposals   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Phase 2.4: Backend Project Chat, Notification Dispatch & Realtime RLS       │
│  └─ Project messages, in-app notification triggers, defense-in-depth RLS     │
├─────────────────────────────────────────────────────────────────────────────┤
│ Phase 2.5: Frontend Layout — Hover-Expandable Sidebar & Top Header          │
│  └─ AppSidebar (collapsed -> hover expand), WorkspaceLayout, NotificationBell│
├─────────────────────────────────────────────────────────────────────────────┤
│ Phase 2.6: Frontend Workspace — Kanban, Calendar, Review Queues & Modals    │
│  └─ KanbanBoard, WorkspaceCalendar, TaskDetailModal, SupervisorReviewModal   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Phase 2.7: End-to-End Verification & Documentation Update                   │
│  └─ Automated RBAC test suite, cross-role browser verification, WORKLOG.md   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 2.1: Database Migration & Shared Contracts
**Goal:** Establish the single source of truth for schema, entities, enums, and API interfaces.

### 1. Migration: `supabase/migrations/20260816000000_research_workspace.sql`
* **Postgres Enums**:
  * `project_status`: `'Planning'`, `'Ongoing'`, `'Writing'`, `'Submitted'`, `'Completed'`
  * `project_role`: `'Member'`, `'CoSupervisor'`
  * `project_invite_type`: `'Email'`, `'Code'`
  * `project_invite_status`: `'Pending'`, `'Accepted'`, `'Revoked'`
  * `milestone_status`: `'Pending'`, `'InProgress'`, `'Completed'`
  * `task_priority`: `'Low'`, `'Medium'`, `'High'`
  * `task_status`: `'ToDo'`, `'InProgress'`, `'Submitted'`, `'UnderReview'`, `'Approved'`, `'RevisionRequested'`
  * `notification_type`: `'TaskAssigned'`, `'DeadlineIn48h'`, `'RevisionRequested'`, `'TaskApproved'`, `'ReviewDeadline'`, `'BookingRequest'`, `'ForumReply'`, `'MilestoneDue'`
  * `notification_channel`: `'InApp'`, `'Email'`
* **8 Core Tables**:
  1. `projects`: `id uuid PK`, `owner_id uuid FK→profiles(id)`, `is_personal bool`, `title text`, `abstract text`, `domain_tags text[]`, `start_date date`, `end_date date`, `status project_status`, `progress_percent int default 0`, `created_at timestamptz`.
  2. `project_members`: `id uuid PK`, `project_id uuid FK→projects(id) ON DELETE CASCADE`, `user_id uuid FK→profiles(id)`, `project_role project_role`, `added_by uuid FK→profiles(id)`, `joined_at timestamptz`, unique `(project_id, user_id)`.
  3. `project_invites`: `id uuid PK`, `project_id uuid FK→projects(id) ON DELETE CASCADE`, `created_by uuid FK→profiles(id)`, `invite_type project_invite_type`, `invited_email text`, `code text unique`, `max_uses int`, `uses_count int default 0`, `expires_at timestamptz`, `status project_invite_status`.
  4. `milestones`: `id uuid PK`, `project_id uuid FK→projects(id) ON DELETE CASCADE`, `name text`, `target_date date`, `weight_pct int`, `status milestone_status`, `is_locked bool default false`, `is_proposed bool default false`, `proposed_by uuid FK→profiles(id)`.
  5. `tasks`: `id uuid PK`, `project_id uuid FK→projects(id) ON DELETE CASCADE`, `milestone_id uuid FK→milestones(id)` *(nullable)*, `title text`, `description text`, `assignee_id uuid FK→profiles(id)`, `created_by uuid FK→profiles(id)`, `due_date date`, `priority task_priority`, `status task_status`, `progress_note text`, `revision_note text`, `is_proposed bool default false`, `proposed_by uuid FK→profiles(id)`, `created_at timestamptz`, `updated_at timestamptz`.
  6. `task_comments`: `id uuid PK`, `task_id uuid FK→tasks(id) ON DELETE CASCADE`, `author_id uuid FK→profiles(id)`, `body text`, `created_at timestamptz`.
  7. `project_messages`: `id uuid PK`, `project_id uuid FK→projects(id) ON DELETE CASCADE`, `sender_id uuid FK→profiles(id)`, `body text`, `created_at timestamptz`.
  8. `notifications`: `id uuid PK`, `user_id uuid FK→profiles(id) ON DELETE CASCADE`, `type notification_type`, `payload jsonb`, `channel notification_channel default 'InApp'`, `is_read bool default false`, `created_at timestamptz`.
* **RLS & Realtime**:
  * Enable Realtime replication publication on `project_messages` and `notifications`.
  * Enable RLS on all 8 tables with defense-in-depth `SELECT` policies for realtime subscribers.

### 2. Shared Types: `packages/shared-types/src/index.ts`
* Export all TypeScript enums, Entity interfaces, Request DTOs, and Response shapes.

---

## Phase 2.2: Backend Projects, Membership & Invite Engine
**Goal:** Implement project lifecycle, membership boundaries, and invite code mechanics.

* **Guards (`apps/api/src/middleware/workspaceGuards.ts`)**:
  * `requireProjectMember`: Verifies caller is in `project_members` or `projects.owner_id`.
  * `requireProjectOwnerSupervisor`: Verifies caller is `projects.owner_id` (Project Owner Supervisor).
* **Services**:
  * `project.service.ts`:
    * `listUserProjects(userId, role)`: Returns accessible projects (or aggregate metadata for Admin).
    * `createProject(userId, role, dto)`: Supervisors create supervised projects; Researchers create personal projects (`is_personal = true`).
    * `updateProject(userId, projectId, dto)`: Project Owner Supervisor / personal owner only.
    * `recalculateProgress(projectId)`: Computes progress percentage using milestone weights or task ratio.
    * `addMember`, `removeMember`.
  * `invite.service.ts`:
    * `createInvite`: Generates unique invite codes / email invites.
    * `acceptInviteCode`: Authenticated Researcher joins project as `Member`.
* **Routes**: `/api/v1/projects`, `/api/v1/projects/:projectId/members`, `/api/v1/projects/:projectId/invites`, `/api/v1/invites/:code/accept`.

---

## Phase 2.3: Backend Task State Machine, Milestones & Proposals
**Goal:** Implement strict task governance, proposal approval, supervisor review queues, and milestone locking.

* **Services**:
  * `task.service.ts`:
    * `createTask`: Project Owner Supervisor assigns directly; Researcher creates in personal project (self-assigned) or as proposal (`is_proposed = true`).
    * `submitTask`: Assignee moves task to `Submitted` with progress note $\rightarrow$ enters review queue.
    * `approveTask`: Project Owner Supervisor moves task to `Approved` $\rightarrow$ recalculates progress and dispatches `TaskApproved` notification.
    * `requestRevision`: Project Owner Supervisor sets `RevisionRequested` with feedback note $\rightarrow$ loops back to assignee with `RevisionRequested` notification.
    * `approveTaskProposal`: Project Owner Supervisor activates proposed task (`is_proposed = false`) $\rightarrow$ dispatches `TaskAssigned` notification.
    * `addTaskComment`, `listTaskComments`.
  * `milestone.service.ts`:
    * `createMilestone`, `updateMilestone`, `lockMilestone`, `approveMilestoneProposal`.
* **Routes**:
  * `PATCH /api/v1/tasks/:id`
  * `POST /api/v1/tasks/:id/submit`
  * `POST /api/v1/tasks/:id/approve`
  * `POST /api/v1/tasks/:id/revision`
  * `POST /api/v1/tasks/:id/approve-proposal`
  * `GET/POST /api/v1/tasks/:id/comments`
  * `PATCH /api/v1/milestones/:id`
  * `POST /api/v1/milestones/:id/lock`
  * `POST /api/v1/milestones/:id/approve-proposal`

---

## Phase 2.4: Backend Project Chat, Notifications & Realtime RLS
**Goal:** Implement scoped project chat and automated notification dispatch.

* **Services**:
  * `message.service.ts`: Scoped project chat persistence and Realtime broadcast.
  * `notification.service.ts`: In-app notification creation, retrieval, and mark-as-read.
* **Routes**:
  * `GET/POST /api/v1/projects/:projectId/messages`
  * `GET /api/v1/notifications`
  * `PATCH /api/v1/notifications/:id/read`

---

## Phase 2.5: Frontend Layout — Hover-Expandable Sidebar & Top Header
**Goal:** Build the shared, responsive layout matching the reference hover-expandable interaction without content overlap.

* **Components (`apps/web/src/components/layout/`)**:
  * `AppSidebar.tsx`: Default collapsed (`w-[72px]`), automatically expands on hover (`w-64`) with smooth CSS width transition, vertically centered Lucide icons, and Quantum Violet active pills.
  * `WorkspaceLayout.tsx`: Shared coordinating layout with flex grid; main content smoothly adjusts available width without being covered.
  * `TopHeader.tsx`: Project Selector dropdown, live `NotificationBell`, reputation pill, and User Profile menu.
  * `NotificationBell.tsx`: Realtime bell with unread badge count and mark-as-read interaction.

---

## Phase 2.6: Frontend Workspace Views — Kanban, Calendar & Modals
**Goal:** Build the interactive research workspace dashboards for Researchers and Supervisors.

* **Components (`apps/web/src/components/workspace/`)**:
  * `KanbanBoard.tsx`: 5 status columns (`To-Do`, `In Progress`, `Submitted`, `Under Review`, `Approved / Revision`) using backend-enforced transition endpoints.
  * `WorkspaceCalendar.tsx`: Deadline calendar plotting `Task.dueDate` and `Milestone.targetDate`.
  * `TaskDetailModal.tsx`: Task progress note editor, deliverable submission, and live comment thread.
  * `SupervisorReviewModal.tsx`: Approve or Request Revision dialog with feedback textarea.
  * `MilestoneTimeline.tsx`: Weighted progress bar, proposal approvals, locking toggle.
  * `ProjectMembersModal.tsx` & `CreateProjectModal.tsx`.
  * `ProjectChatDrawer.tsx`: Scoped team chat drawer with live Realtime message stream.
* **Page Integration**:
  * Mount inside `ResearcherWorkspacePage.tsx` and `SupervisorDashboardPage.tsx` wrapped in `WorkspaceLayout`.

---

## Phase 2.7: End-to-End Verification & Documentation Update
**Goal:** Run automated test suites, verify all acceptance criteria, and update project logs.

* **Automated Tests**: Run `apps/api/src/tests/workspace.test.ts`.
* **Build Verification**: Run `pnpm build` across all workspaces.
* **Documentation**: Update root `WORKLOG.md` with completed Module 02 work.

---

## 10. Verification Plan & Test Cases

### Automated Backend Test Suite (`apps/api/src/tests/workspace.test.ts`):
1. `test_researcher_create_personal_project_success`
2. `test_researcher_create_supervised_project_forbidden`
3. `test_supervisor_create_supervised_project_success`
4. `test_project_owner_supervisor_assign_task_to_member_success`
5. `test_cosupervisor_attempt_project_governance_forbidden`
6. `test_researcher_task_proposal_requires_owner_supervisor_approval`
7. `test_researcher_self_approve_forbidden_returns_403`
8. `test_invalid_task_state_transition_forbidden`
9. `test_supervisor_approve_task_and_recalculate_progress`
10. `test_supervisor_request_revision_loops_back_to_inprogress`
11. `test_non_member_read_project_forbidden_returns_403`
12. `test_nonmember_realtime_project_message_isolation`
13. `test_project_invite_code_generation_and_acceptance`
14. `test_locked_milestone_prevents_task_edits`
15. `test_admin_cannot_read_private_project_tasks_returns_403`

### Commands:
```bash
# Test execution
pnpm --filter @researchos/api test src/tests/workspace.test.ts

# Monorepo build
pnpm --filter @researchos/shared-types build
pnpm --filter @researchos/api build
pnpm --filter @researchos/web build
```

---

## 11. Execution Progress & Activity Log

> This section is actively updated during development to track completed sub-features, files modified, and verification results for Module 02.

| Phase | Sub-Feature | Status | Completed Date | Key Changes & Notes |
| :--- | :--- | :---: | :---: | :--- |
| **Phase 2.1** | Database Migration & Shared Contracts | ✅ Completed | 2026-08-15 | Created `supabase/migrations/20260816000000_research_workspace.sql` (8 tables, constraints, indexes, Realtime publication, RLS). Applied migration to Supabase remote DB. Updated `packages/shared-types/src/index.ts` with all enums, entities, DTOs. |
| **Phase 2.2** | Backend Projects, Membership & Invites | ✅ Completed | 2026-08-15 | Created `workspaceGuards.ts`, `project.service.ts`, `invite.service.ts`, `project.routes.ts`, `invite.routes.ts`. Enforced personal vs supervised creation rules, Project Owner Supervisor governance, invite code generation & acceptance. Verified with automated test suite (19/19 tests passing). |
| **Phase 2.3** | Backend Task State Machine & Milestones | ✅ Completed | 2026-08-15 | Created `milestone.service.ts`, `task.service.ts`, `milestone.routes.ts`, `task.routes.ts`, `notification.service.ts`. Enforced strict task state machine (`ToDo`<->`InProgress`->`Submitted`->`Approved`/`RevisionRequested`), supervisor review loop, task & milestone proposals (`/approve-proposal`), milestone locking, and comment threads. Verified with automated test suite (31/31 tests passing). |
| **Phase 2.4** | Backend Project Chat & Notifications | ✅ Completed | 2026-08-15 | Created `message.service.ts`, `message.routes.ts`, `notification.routes.ts`. Implemented project chat send & list, in-app notification querying, mark-as-read, unread badge counter, and verified Realtime RLS non-member isolation. Automated test suite (36/36 tests passing). |
| **Phase 2.5** | Frontend Layout (Hover-Expandable Sidebar) | ✅ Completed | 2026-08-15 | Created `AppSidebar.tsx` (collapsed `w-[72px]` -> hover expand `w-64`), `TopHeader.tsx` (project switch, status pills, quick action buttons, Realtime pulse), `NotificationBell.tsx` (badge counter + live Realtime drawer), `WorkspaceLayout.tsx` (smooth coordinated margin expand). |
| **Phase 2.6** | Frontend Workspace Views & Modals | ✅ Completed | 2026-08-15 | Built `KanbanBoard.tsx` (5 status columns, task transition actions, drag-style drop triggers), `WorkspaceCalendar.tsx` (scheduled deadline roadmap), `TaskDetailModal.tsx` (task inspector with live comment thread), `SupervisorReviewModal.tsx` (deliverable approval & revision request loops), `MilestoneTimeline.tsx` (milestone progress, proposals, locking controls), `ProjectMembersModal.tsx` (member list & single-use invite code generator), `ProjectChatDrawer.tsx` (Realtime project chat stream), `NewTaskModal.tsx` & `NewMilestoneModal.tsx`. Integrated into `ResearcherWorkspacePage.tsx` and `SupervisorDashboardPage.tsx`. |
| **Phase 2.7** | End-to-End Verification & QA | ✅ Completed | 2026-08-15 | Full automated test suite verification passed (36/36 backend tests in `apps/api/src/tests/workspace.test.ts` passing; 30/30 frontend tests in `apps/web/src/tests/*.test.tsx` passing). Production bundle builds verified (`@researchos/web` and `@researchos/api` compile cleanly with 0 TypeScript/ESLint errors). |
| **Phase 2.8** | Layout Restructure, Dashboard Home & Seed Data Polish | ✅ Completed | 2026-08-16 | **1. Layout Architecture:** TopHeader is now a fixed full-width region (`fixed top-0 left-0 right-0 z-50`), completely independent of the sidebar. The AppSidebar starts below the topbar (`top-16`, `h-[calc(100vh-4rem)]`) and hover-expands strictly within its sub-region without affecting the topbar.<br>**2. Logo Consistency:** Integrated canonical brand `Logo` component (`Sparkles` gradient orb + "ResearchOS") in the TopHeader for consistency with the Landing Page.<br>**3. Dashboard Home:** Implemented role-specific dashboard home hubs for Researcher and Supervisor accounts with project card grids, progress gauges, domain tags, quick metrics (projects, tasks, students), and empty-state CTA actions.<br>**4. Routing & Tab Navigation:** Fixed sidebar routing so internal workspace views ("Workspace Board", "Milestones & Timeline") switch tabs in-place without triggering full page reloads or falling back to the Landing Page. "Dashboard" sidebar item returns to the project hub.<br>**5. Sign Out Fix:** Sign out action now cleans session and navigates cleanly to the Landing Page (`/`).<br>**6. Missing Endpoint:** Added `GET /projects/:projectId/members` endpoint in `project.routes.ts` with `listProjectMembers` in `project.service.ts`.<br>**7. Comprehensive Seed Data:** Populated rich seed data in `supabase/seed.sql` for all roles (Admin, Supervisor, Researchers) with 4 projects, milestones, tasks across all 6 Kanban states, task comments, project chat messages, and in-app notifications. |
| **Phase 2.9** | User Avatar Images, Back Navigation Interceptor & Dedicated Project URLs | ✅ Completed | 2026-08-16 | **1. Reusable UserAvatar Component:** Created `UserAvatar.tsx` rendering dynamic image URLs with automatic fallback to role-gradient initial letters on broken/empty links.<br>**2. Profile Photo Management:** Integrated live avatar preview and custom photo URL input with preset avatars in `ProfilePage.tsx`.<br>**3. Workspace Avatar Integration:** Replaced static initial avatars across Sidebar, Welcome Banners, Kanban Cards, Task Details, Member Modals, Supervisor Reviews, and Realtime Team Chat with `UserAvatar`.<br>**4. Browser Back Button Interceptor:** Intercepts browser `popstate` navigation when authenticated inside the workspace. When on the root `/dashboard`, clicking the browser's Back button directly triggers the professional `ExitWorkspaceModal` ("Stay in Workspace" vs. "Sign Out & Return Home") without reversing through previously visited internal pages (`dashboard -> page1 -> page2 -> dashboard`).<br>**5. Auth Route Guarding:** Added automatic `/dashboard` redirect in `LoginPage.tsx` and `SignupPage.tsx` for already authenticated active users.<br>**6. Dedicated Project URLs:** Clicking any project card on the dashboard navigates directly to `/projects/:projectId`. All Kanban boards, tasks, milestones, and chat load under this dedicated URL, allowing direct bookmarking, refreshing, and clean browser back navigation back to `/dashboard`.<br>**7. Topbar & Logo Unification:** Standardized the top header across `ProfilePage.tsx` and `AdminConsolePage.tsx` to match the exact `h-16` fixed height (`fixed top-0 left-0 right-0 h-16`), backdrop blur (`bg-[#0A0914]/95 backdrop-blur-xl border-white/10`), canonical `Logo` (`size="sm" showBadge={false}`), and proper `pt-24` main content offset as the Dashboard. |
| **Phase 2.10** | Global Hover-Activated Dropdown / Select System | ✅ Completed | 2026-08-16 | **1. Reusable HoverSelect Component:** Created `HoverSelect.tsx` replacing OS-native `<select>` tags across ResearchOS.<br>**2. Entire Field Hover Trigger:** Hovering anywhere over the select field smoothly reveals the options menu without requiring a click on desktop.<br>**3. Smooth 180° Chevron Animation:** Chevron smoothly rotates 180° over 200ms with easing curves.<br>**4. Anti-Flicker Bridge:** Invisible hover bridge and debounced leave timer ensure moving the cursor into the options menu never prematurely closes the dropdown.<br>**5. Option Highlighting & Explicit Selection:** Options highlight smoothly on hover and remain preview-only until clicked/tapped, updating state cleanly.<br>**6. Platform-wide Integration:** Integrated across `KanbanBoard.tsx` (Milestones, Assignees), `NewTaskModal.tsx` (Milestones, Priorities, Assignees), `TopHeader.tsx` (Project Switcher), and `AdminConsolePage.tsx` (Role Assignment).<br>**7. Accessibility & Touch Support:** Full keyboard navigation (`ArrowUp`/`ArrowDown`/`Enter`/`Space`/`Escape`) and tap-to-toggle support for touchscreens and mobile devices.<br>**8. Layering, Stacking Order & 100% Solid Opaque Popover:** Fixed the underlying CSS stacking context by setting `relative z-30` on the filter toolbar and `relative z-10` on the Kanban columns grid. Popovers now use a 100% solid, fully opaque surface (`bg-[#131126]` with `border-white/20 shadow-2xl shadow-black`), ensuring dropdowns always float on the foreground layer without background cards or text showing through.<br>**9. Cosmic Neon Styling & Shimmer Animation:** Styled dropdown popovers with an elevated cosmic indigo surface (`linear-gradient(180deg, #1A1733 0%, #120F24 100%)`), dual-tone breathing neon border glow (`border-neon-glow` keyframe), a sweeping neon shimmer line (`popover-neon-sweep`), and luminous active/hover states (`bg-gradient-to-r from-violet-600/35 via-indigo-600/25` with glowing violet checkmarks). |

---
*Last updated: 2026-08-16 — Module 02 Research Workspace Complete & Polished*


