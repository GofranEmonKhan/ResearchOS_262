# Spec 01 — Authentication, RBAC & Role Dashboards (Skeleton)

*Revision 4 — RBAC now defaults to a `profiles` table lookup instead of a Custom Access Token Hook (simpler to build, no token-staleness problem); role-claim naming corrected; CLI commands use `pnpm supabase`; key naming updated to Supabase's current publishable/secret format.* Save as `docs/specs/01-auth-rbac.md`. Depends on `00-foundation.md`. Use **Plan mode + Review-driven autonomy** — this touches RBAC middleware, review each step.

## Goal
Implement Module 1 of `feature-plan.md`: registration (email/password + Google OAuth) via Supabase Auth, role-based signup with Supervisor pending-verification, a `profiles` table populated automatically from `auth.users`, Express RBAC middleware that reads role/status from a live `profiles` lookup, profile management, Admin account controls, audit logging, and an empty role-gated dashboard shell per role. No project/task/paper features yet.

## Entities & relations
Add via a new migration `supabase/migrations/*_auth_and_profiles.sql` (full field definitions in `docs/data-model.md` §1 — copy verbatim):
- `profiles` (referenced as `User` elsewhere in the docs)
- `SupervisorVerificationRequest`
- `AuditLog`

Enums: `UserRole (Admin, Supervisor, Researcher)`, `UserStatus (Active, PendingVerification, Suspended)`, `VerificationStatus (Pending, Approved, Rejected)`.

Also in this migration: the `handle_new_user()` trigger function on `auth.users` (AFTER INSERT) that creates the matching `profiles` row from `raw_user_meta_data`. **No Custom Access Token Hook is needed for this phase** — see the design decision below.

## Auth design decisions
- **Signup, login, OAuth, logout, password reset** are all handled by Supabase Auth directly — the frontend calls `supabase.auth.signUp()`, `signInWithPassword()`, `signInWithOAuth({ provider: 'google' })`, `signOut()`, `resetPasswordForEmail()` from the client initialized with the **publishable key**. **Do not build custom Express routes that duplicate these.**
- **Role/institution/department at signup**: passed as `options: { data: { fullName, roleRequest, institution, department, researchFieldTags } }` in `signUp()` — lands in `auth.users.raw_user_meta_data`, read by the `handle_new_user()` trigger to populate `profiles`.
- **Google OAuth first-login gap**: OAuth doesn't carry those custom fields. After `signInWithOAuth` returns for a brand-new user, the frontend must detect an incomplete/missing `profiles` row and route to a short "complete your profile" step (role, institution, department) before treating the user as fully onboarded.
- **RBAC mechanism — read this carefully, it's a deliberate simplification, not a shortcut taken by mistake:** role and status are **not** carried as custom JWT claims in this phase. On every authenticated request, Express:
  1. Verifies the incoming JWT locally against the project's JWKS endpoint (`https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`) — confirms authenticity, extracts `sub` (the user id). Cache the public keys; don't hit the endpoint per request.
  2. Queries `profiles` for that id to get the current `role` and `status`.
  3. `requireRole(...roles)` / `requireStatus(Active)` middleware checks against that live read.

  This is simpler to build and debug than a Custom Access Token Hook, and it has no staleness problem — suspend a user and their very next request is rejected immediately, rather than waiting for their current token to expire. Do not add a Custom Access Token Hook in this phase.
- **Do not read Supabase's built-in JWT `role` claim expecting an application role.** That claim is a Postgres access role (`anon` / `authenticated` / `service_role` — unchanged Postgres role names, distinct from the publishable/secret key rename below), unrelated to Admin/Supervisor/Researcher. If a `user_role` custom claim is ever added later, it must be named distinctly from the built-in claim and treated as a separate, later change to this design — not something to reach for now.
- **Admin actions** (suspend, force-password-reset, role change, force sign-out) go through Express endpoints using the client initialized with the **secret key**, never exposed to the frontend directly. Remember: the secret key bypasses Row Level Security entirely, so Express's own checks are the only authorization happening here — there's no RLS layer catching a mistake.

## API endpoints
Deliberately short — most of Module 1's original surface is handled by the Supabase client directly from the frontend.

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/me` | authenticated | Returns current user's `profiles` row (the same live lookup RBAC middleware already does). |
| PATCH | `/me` | authenticated | Updates own profile: photo, bio, orcidUrl, scholarUrl, researchInterests, skills. Cannot change `role`, `status`, or `id`. |
| POST | `/supervisor-verification` | Supervisor (own account, PendingVerification) | body: Storage path of the uploaded faculty ID doc + `institutionDomain`. Creates a `SupervisorVerificationRequest`. |
| GET | `/admin/supervisor-verifications` | Admin only | Queue of pending requests. |
| POST | `/admin/supervisor-verifications/:id/approve` | Admin only | Sets request `status=Approved`, flips `profiles.status=Active`. Writes `AuditLog`. |
| POST | `/admin/supervisor-verifications/:id/reject` | Admin only | body: `rejectionReason`. Writes `AuditLog`. |
| POST | `/admin/users/:id/suspend` | Admin only | Sets `profiles.status=Suspended`, calls Supabase admin API to force sign-out (belt-and-suspenders — the `profiles` lookup already blocks them immediately on their next request either way). Writes `AuditLog`. |
| POST | `/admin/users/:id/force-password-reset` | Admin only | Calls Supabase admin API to invalidate session / trigger reset email. Writes `AuditLog`. |
| PATCH | `/admin/users/:id/role` | Admin only | Changes `profiles.role`. Writes `AuditLog`. |

## Frontend routes (skeleton only — empty shells)
- `/signup`, `/login`, `/forgot-password`, `/reset-password`, `/complete-profile` (OAuth first-login gap)
- `/dashboard` → redirect based on `role`:
  - Researcher → `/dashboard/workspace` ("My Workspace")
  - Supervisor → `/dashboard/supervision` ("Supervision Dashboard") — if `status=PendingVerification`, show a banner instead of dashboard content
  - Admin → `/dashboard/admin` ("Admin Console")
- `/profile` — view/edit own profile, all roles

## Role behavior (from `feature-plan.md` Module 1)
- **Researcher:** Signs up freely and is auto-activated. Lands on "My Workspace." Can join a project only through a supervisor's invite or invite code (Phase 2 — just stub the entry point/route here).
- **Supervisor:** Signs up but goes to Pending Verification — must be approved by Admin (faculty ID upload / institutional email domain check). Until approved, can browse but not create projects. Lands on "Supervision Dashboard."
- **Admin:** No public signup — seeded manually (via `supabase/seed.sql`, or promote an existing user's role directly for local dev). Lands on "Admin Console." Can force password reset, suspend, or delete an account, and change any user's role.

## Out of scope for this phase
No project/task/paper/experiment/manuscript/marketplace/forum code. No Custom Access Token Hook (see design decision above — deliberately deferred, not forgotten). No real email-sending provider configuration beyond Supabase Auth's default for verification/reset emails.

## Acceptance criteria
- [ ] Researcher signup via `supabase.auth.signUp()` → `handle_new_user()` trigger creates a `profiles` row with `status=Active`, no Admin action needed
- [ ] Supervisor signup → `profiles.status=PendingVerification`; hitting any project-creation-adjacent route (even a stub) returns 403 until approved
- [ ] Admin approves a pending Supervisor → `profiles.status` flips to `Active` and an `AuditLog` row is written with `action="approve_supervisor"`
- [ ] Google OAuth first-time sign-in routes to `/complete-profile` before landing on a dashboard; returning OAuth users skip straight to their dashboard
- [ ] Express's JWKS-based verification correctly rejects a tampered/expired token and accepts a valid one, without a network round-trip to Supabase on every request (keys cached)
- [ ] RBAC middleware performs a live `profiles` lookup on each request rather than trusting any JWT claim for role/status — confirm by checking a suspended user is rejected on their **very next** request after suspension, without needing to wait for token expiry
- [ ] No Custom Access Token Hook exists in this phase — confirm no Postgres function is registered under Supabase Auth Hooks settings
- [ ] `PATCH /me` cannot change `role`, `status`, or `id` — request is rejected or those fields are silently ignored
- [ ] Only `Admin` role can call any `/admin/*` route — every other role gets 403, verified by an automated test per route
- [ ] Every login, suspend, role-change, force-password-reset, and supervisor-approval/rejection action produces exactly one `AuditLog` row with a non-null `actorId`
- [ ] Visiting `/dashboard` redirects each of three seeded test accounts (Researcher, Supervisor, Admin) to their correct dashboard shell
- [ ] `profiles`, `SupervisorVerificationRequest`, and `AuditLog` match `docs/data-model.md` §1 field-for-field
- [ ] No Express route reimplements signup/login/OAuth/logout/password-reset — confirm these only exist as direct Supabase client calls from the frontend
- [ ] The migration file for this phase exists in `supabase/migrations/` and is committed — not just applied live via the Supabase MCP
