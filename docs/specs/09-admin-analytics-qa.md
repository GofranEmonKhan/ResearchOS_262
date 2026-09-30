# Spec 09 — Admin Console, Analytics & QA

## Goal

Implement Module 9 of `feature-plan.md`: the final Admin Console layer, platform analytics, supervisor-verification queue, marketplace governance, moderation queue, operational/error visibility, aggregate research-platform metrics, audit inspection, and the final QA/testing pass across Phases 1–8. Admin remains a governance role, not a content superuser. The console may expose aggregate metadata and explicit moderation/financial information while preserving private research content boundaries.

**Depends on:** all previous phases, especially `01-auth-rbac.md`, marketplace, forum, AI, notifications

**Agent mode:** Plan mode, Review-driven autonomy. This phase touches privileged operations, analytics, deletion, moderation, and verification.

## Admin access principles

- Admin can govern users and platform health.
- Admin can inspect required operational metadata.
- Admin cannot open researcher paper content, private notes, manuscript text, experiment parameters/results, or ordinary private DM bodies unless a separate feature explicitly grants the limited metadata scope defined in its own spec.
- Every privileged action is auditable.
- Destructive actions require explicit workflow and audit records.

## Entities & relations

This phase primarily consumes existing entities.

### AuditLog

```text
AuditLog {
  id          uuid PK
  actorId     FK→User
  action      string
  targetType  string
  targetId    uuid?
  ipAddress   string?
  metadata    json?
  createdAt   datetime
}
```

Admin-only read. System-side write for privileged actions.

### SupervisorVerificationRequest

Consumed from Phase 1.

### DeletionRequest

```text
DeletionRequest {
  id          uuid PK
  targetType  enum(Project)
  targetId    uuid
  requestedBy FK→User
  reason      string
  status      enum(Pending, Approved, Rejected)
  decidedBy   FK→User?
  createdAt   datetime
}
```

Admin decides; requestor can view their own request status.

## Analytics scope

Feature plan describes Admin aggregate dashboard data including:

- users by role
- pending supervisor verifications
- storage usage
- transaction information
- moderation queue
- error logs

Additional aggregate metrics may reuse existing project/task/activity data, but must not expose private research content unnecessarily.

## API endpoints

> Proposed Admin API contract.

| Method | Path | Roles | Purpose |
|---|---|---|---|
| GET | `/admin/overview` | Admin | Aggregate platform overview |
| GET | `/admin/users` | Admin | User list with operational metadata |
| GET | `/admin/users/:id` | Admin | Account/operational detail, content-safe |
| GET | `/admin/supervisor-verifications` | Admin | Pending verification queue |
| POST | `/admin/supervisor-verifications/:id/approve` | Admin | Approve Supervisor |
| POST | `/admin/supervisor-verifications/:id/reject` | Admin | Reject Supervisor |
| POST | `/admin/users/:id/suspend` | Admin | Suspend and force sign-out |
| POST | `/admin/users/:id/force-password-reset` | Admin | Trigger admin reset flow |
| PATCH | `/admin/users/:id/role` | Admin | Change application role |
| GET | `/admin/audit-logs` | Admin | Search audit events |
| GET | `/admin/marketplace/listings/pending` | Admin | Listing approval queue |
| POST | `/admin/marketplace/listings/:id/approve` | Admin | Approve listing |
| POST | `/admin/marketplace/listings/:id/reject` | Admin | Reject listing |
| POST | `/admin/marketplace/listings/:id/delist` | Admin | Delist listing |
| GET | `/admin/marketplace/disputes` | Admin | Dispute queue |
| POST | `/admin/marketplace/disputes/:id/resolve` | Admin | Resolve dispute |
| GET | `/admin/forum/reports` | Admin | Moderation queue |
| POST | `/admin/forum/reports/:id/action` | Admin | Take moderation action |
| GET | `/admin/ai/usage` | Admin | AI usage/cost analytics |
| GET | `/admin/errors` | Admin | Operational/error log feed |
| GET | `/admin/storage` | Admin | Storage aggregate usage |
| GET | `/admin/deletion-requests` | Admin | Formal deletion queue |
| POST | `/admin/deletion-requests/:id/approve` | Admin | Approve formal deletion |
| POST | `/admin/deletion-requests/:id/reject` | Admin | Reject formal deletion |

### Example overview response

```json
{
  "data": {
    "users": {
      "admin": 1,
      "supervisor": 12,
      "researcher": 84
    },
    "pendingSupervisorVerifications": 4,
    "activeProjects": 31,
    "storageBytes": 123456789,
    "pendingMarketplaceListings": 6,
    "openDisputes": 2,
    "pendingForumReports": 8,
    "aiUsageThisMonth": {
      "tokens": 123456,
      "costUsd": 18.42
    }
  }
}
```

## Role behavior

### Admin

- Approves Supervisor accounts.
- Suspends/bans users.
- Changes application roles through privileged APIs.
- Handles marketplace listing approval and disputes.
- Moderates forum content.
- Configures AI quotas/providers/policies.
- Reads audit/operational analytics.
- Performs formal deletion actions only through logged workflows.
- Cannot inspect private research content as a general-purpose superuser.

### Supervisor

- Uses their normal research dashboard and project-scoped analytics.
- Cannot call Admin APIs.

### Researcher

- Uses their normal workspace and personal analytics.
- Cannot call Admin APIs.

## QA strategy

### Unit-level checks

- RBAC middleware
- ownership guards
- enum/state transitions
- service-layer authorization
- notification ownership
- payment/escrow state machine
- review-comment transitions
- AI quota/access filters

### Integration checks

- Auth + profiles
- Project + membership + tasks
- Paper + shared project access
- Experiments + task linkage
- Manuscript + reviewer workflow
- Forum + reporting
- Marketplace + booking/payment/dispute
- AI + scoped retrieval

### Browser/E2E scenarios

At minimum:

```text
Researcher signup
  → dashboard

Supervisor signup
  → pending verification
  → Admin approves
  → active Supervisor

Supervisor
  → create project
  → invite Researcher
  → assign task

Researcher
  → update task
  → submit

Supervisor
  → approve
  → project progress updates

Researcher
  → upload/read paper
  → fill sidebar
  → create experiment

Researcher
  → create manuscript
  → request review

Supervisor
  → assign reviewer
  → review comment

Researcher
  → fix comment

Supervisor
  → resolve
  → approve for submission
```

Marketplace and AI must have separate E2E flows for their sensitive state transitions.

## Acceptance criteria

- [ ] Only Admin can call `/admin/*` endpoints.
- [ ] All privileged Admin mutations write an `AuditLog` row with a non-null actor.
- [ ] Admin dashboard exposes aggregate operational metrics without exposing prohibited private research content.
- [ ] Admin can approve/reject Supervisor verification requests.
- [ ] Suspending a user blocks their next authenticated protected request through live `profiles` lookup.
- [ ] Admin role changes are audited.
- [ ] Marketplace approval/dispute actions are audited.
- [ ] Forum moderation actions are audited.
- [ ] AI quota/provider configuration changes are audited.
- [ ] Formal project deletion requires the declared request/decision workflow where applicable.
- [ ] User/project/research content access boundaries are tested from the Admin perspective.
- [ ] E2E test verifies Researcher → task submission → Supervisor approval → progress update.
- [ ] E2E test verifies Researcher → manuscript review request → Supervisor reviewer assignment → comment → fix → resolve.
- [ ] E2E test verifies marketplace booking cannot bypass payment/escrow state.
- [ ] E2E test verifies AI semantic search cannot cross private-data boundaries.
- [ ] CI passes lint, typecheck, unit/integration tests.
- [ ] Critical acceptance criteria from Specs 01–08 are re-run before declaring the platform complete.
- [ ] Final diff is reviewed and all pending migrations are committed.
