# Spec 09: Admin Console, Analytics & QA — Detailed Implementation & Verification Plan

## 1. Executive Summary & Goal
The objective of **Module 09 (`docs/specs/09-admin-analytics-qa.md`)** is to complete the platform governance, analytics, operational monitoring, formal deletion workflows, and end-to-end quality assurance across all ResearchOS modules (Specs 01–08).

Admin in ResearchOS is strictly a **governance and platform health role**, NOT a content superuser. The Admin Console provides operational control, user lifecycle management, dispute arbitration, moderation, and aggregate analytics while strictly enforcing privacy boundaries over private research files, manuscript content, raw experiment logs, and direct messages.

---

## 2. Current Implementation Audit: What Exists vs. What is Missing

### 2.1 Implemented So Far (Phase 1–8 Groundwork)
| Feature / Subsystem | Status | Current Location | Details |
|---|---|---|---|
| **Admin RBAC & Auth Guard** | ✅ Implemented | `apps/api/src/middleware/auth.ts`, `apps/api/src/routes/admin.routes.ts` | Verified Supabase JWT + live `profiles.role === 'Admin'` + status check. Non-admin access to `/admin/*` returns `403 Forbidden`. |
| **Supervisor Verification Queue** | ✅ Implemented | `apps/api/src/routes/admin.routes.ts`, `AdminConsolePage.tsx` | `GET /admin/supervisor-verifications`, `POST .../approve`, `POST .../reject`. Activates profiles and records `AuditLog`. |
| **User Status & Role Control** | ✅ Implemented | `apps/api/src/routes/admin.routes.ts`, `AdminConsolePage.tsx` | `POST /admin/users/:id/suspend` (invalidates auth sessions), `POST /admin/users/:id/force-password-reset`, `PATCH /admin/users/:id/role`. |
| **Audit Logging Infrastructure** | ✅ Implemented | `apps/api/src/services/audit.service.ts` | Logs `actor_id`, `action`, `target_type`, `target_id`, `ip_address`, `metadata`, `created_at` to `public.audit_logs`. |
| **Forum Moderation Queue** | ✅ Implemented | `apps/api/src/routes/admin.routes.ts`, `AdminModerationModal.tsx` | `GET /admin/forum/reports`, `POST /admin/forum/reports/:id/action`. Enforces AC-13 metadata-only privacy redaction for DM reports. |
| **Marketplace Governance & Disputes** | ✅ Implemented | `apps/api/src/routes/marketplace.routes.ts`, `AdminMarketplaceGovernancePage.tsx` | `GET /admin/marketplace/listings/pending`, `POST .../approve`, `POST .../reject`, `POST .../delist`, `GET .../disputes`, `POST .../resolve`, `GET .../ledger`. |
| **AI Governance & Configuration** | ✅ Implemented | `apps/api/src/routes/admin.routes.ts`, `AdminAiConfigPanel.tsx` | `GET/PATCH /admin/ai/config` (never exposes raw keys), `GET/PATCH /admin/ai/quotas`, `GET/POST/DELETE /admin/ai/blocked-rules`, `GET /admin/ai/usage`. |
| **Admin Content-Privacy Boundary** | ✅ Implemented | `literature.test.ts`, `ExperimentTrackerPage.tsx`, `MarketplaceListingDetailPage.tsx` | Admin blocked from viewing private paper notes/PDFs, experiment data, and booking research compute. |

---

### 2.2 Missing / Incomplete Requirements to Implement in Module 09
| Requirement | Status | Required Action |
|---|---|---|
| **Database: Deletion Requests Table** | ⏳ Missing Schema | Create migration `supabase/migrations/20261004000000_admin_deletion_requests.sql` for `public.deletion_requests`. |
| **`GET /admin/overview`** | ⏳ Missing Endpoint | Aggregates user counts by role, pending supervisor verifications, active projects count, storage footprint, pending marketplace listings, open disputes, pending forum reports, and AI token/cost usage. |
| **`GET /admin/users`** | ⏳ Missing Endpoint | Searchable, filterable, and paginated directory of all platform users with operational metadata (role, status, institution, joinedAt, projectCount). |
| **`GET /admin/users/:id`** | ⏳ Missing Endpoint | Content-safe operational detail for a single user (account status, role history, owned projects metadata count, verification history). |
| **`GET /admin/audit-logs`** | ⏳ Missing Endpoint | Searchable and filterable audit log reader with pagination, action filtering, actor filtering, and date range filtering. |
| **`GET /admin/storage`** | ⏳ Missing Endpoint | Storage usage summary breakdown across Supabase Storage buckets (`papers`, `manuscript_figures`, `experiments`, `forum_attachments`). |
| **`GET /admin/errors`** | ⏳ Missing Endpoint | Operational log stream of recent system errors and failed requests. |
| **`GET /admin/deletion-requests` & `POST .../approve`, `POST .../reject`** | ⏳ Missing Endpoints | Formal project deletion queue and supervisor request adjudication. |
| **Frontend: Platform Overview Dashboard** | ⏳ Missing UI | Comprehensive aggregate KPI cards, storage usage gauges, and activity charts. |
| **Frontend: User Management Directory** | ⏳ Missing UI | Searchable, filterable users table with status badges and 1-click action menus (Suspend, Reactivate, Change Role, Reset Password). |
| **Frontend: Audit Log Explorer** | ⏳ Missing UI | Searchable audit feed with actor information, action tags, timestamp badges, and metadata JSON viewer. |
| **Frontend: System Health & Deletion Queue** | ⏳ Missing UI | Deletion request approval queue, storage bucket breakdown, and operational health status. |
| **Comprehensive E2E QA Test Suite** | ⏳ Missing Test Pass | Full regression test suite verifying multi-role end-to-end flows (Specs 01–08 integration). |

---

## 3. Contradiction & Alignment Check

1. **Schema Source of Truth**:
   - `docs/data-model.md` line 790 and `docs/specs/09-admin-analytics-qa.md` line 47 specify `DeletionRequest { id, targetType: enum(Project), targetId, requestedBy, reason, status: enum(Pending, Approved, Rejected), decidedBy, createdAt }`.
   - Migration file `supabase/migrations/20261004000000_admin_deletion_requests.sql` will be created and applied so schema, data model, and specs match 100%.
2. **Admin Privacy Constraints**:
   - `AGENTS.md` and `docs/specs/09-admin-analytics-qa.md` mandate that Admin cannot inspect private researcher content.
   - All newly introduced endpoints (`/admin/overview`, `/admin/users`, `/admin/storage`) will return strictly operational numbers, counts, and metadata without exposing manuscript LaTeX texts, paper PDFs, or private notes.
3. **Route Mount Uniformity**:
   - Marketplace routes in `marketplace.routes.ts` and `admin.routes.ts` will remain cleanly mounted and documented.

---

## 4. Phased Implementation Plan for Module 09

### Phase 9.1: Database Migration & Shared Types
1. Create `supabase/migrations/20261004000000_admin_deletion_requests.sql`:
   - Enums: `deletion_request_target ('Project')`, `deletion_request_status ('Pending', 'Approved', 'Rejected')`.
   - Table `public.deletion_requests` with RLS (Admin full access; users can view and create their own requests).
   - Execute migration via Supabase MCP tool.
2. Update `packages/shared-types/src/index.ts`:
   - Add `DeletionRequest`, `CreateDeletionRequestDto`, `DecideDeletionRequestDto`.
   - Add `AdminPlatformOverview`, `AdminUserListItem`, `AdminAuditLogQuery`, `AdminStorageMetrics`, `AdminSystemErrorLog`.

### Phase 9.2: Backend API & Service Layer (`apps/api`)
1. Create `apps/api/src/services/admin.service.ts`:
   - `getPlatformOverview()`: Live parallel aggregations of users, projects, verification queue, marketplace listings/disputes, forum reports, AI tokens/costs.
   - `listUsers(params)`: Paginated query with keyword search, role filter, status filter, and joined project counts.
   - `getUserDetail(userId)`: Content-safe operational profile details.
   - `listAuditLogs(params)`: Paginated search with actor/action/targetType filters.
   - `getStorageMetrics()`: Aggregation across storage buckets.
   - `listDeletionRequests()`, `approveDeletionRequest()`, `rejectDeletionRequest()`.
2. Update `apps/api/src/routes/admin.routes.ts`:
   - Mount all Spec 09 proposed endpoints with `authenticate`, `requireStatus('Active')`, `requireRole('Admin')`.

### Phase 9.3: Frontend Admin Console Redesign (`apps/web`)
1. Refactor `AdminConsolePage.tsx` into a modular, tabbed Command Center:
   - **Tab 1: Platform Overview**: High-impact KPI cards (Total Users, Active Projects, Storage Used, Monthly AI Cost, Pending Actions), quick action alerts.
   - **Tab 2: User Directory**: Searchable data table with role pills, status indicators, and actions modal (Role change, Suspend/Reactivate, Password Reset).
   - **Tab 3: Verification Queue**: Supervisor credential review cards with document previews, institution domain verification, and 1-click Approve/Reject.
   - **Tab 4: Audit & Security Logs**: Filterable timeline of all privileged mutations, security events, and IP addresses.
   - **Tab 5: Governance & Moderation Hub**: Embedded sub-navigation for Marketplace Governance (`/admin/marketplace`), Forum Moderation, and Deletion Requests Queue.
   - **Tab 6: System Health & Storage**: Storage bucket distribution, operational error stream, and database status.
   - **Tab 7: AI Configuration**: Existing `AdminAiConfigPanel` seamlessly integrated.
2. Update `apps/web/src/lib/api.ts` with typed methods for all new Admin endpoints.

### Phase 9.4: End-to-End QA & Regression Test Suite
1. Create `apps/api/src/tests/admin-console.test.ts`:
   - Test all `/admin/*` endpoints for Admin authorization.
   - Test 403 Forbidden for Researcher and Supervisor tokens.
   - Test `GET /admin/overview`, `GET /admin/users`, `GET /admin/audit-logs`, `GET /admin/storage`.
   - Test `DeletionRequest` lifecycle (create → list → approve → project cascade / reject).
   - Test Admin content privacy boundaries (confirming admin cannot read private manuscripts, notes, or experiment files).
2. Create `apps/web/src/tests/admin-console-ui.test.tsx`:
   - Test AdminConsolePage tab navigation, user search, audit log rendering, and action modals.
3. Run complete multi-module test runner across Specs 01–09:
   - `pnpm --filter api test`
   - `pnpm --filter web test`
   - `pnpm --filter web build`
