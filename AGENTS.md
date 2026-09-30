# ResearchOS — Agent Rules

## 1. Architecture

- Frontend: React + Vite + TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, React Router.
- Backend: Node.js + Express + TypeScript.
- All business logic, authorization, RBAC, ownership checks, and state-transition enforcement live in the backend.
- Database: Supabase Postgres + pgvector.
- Data access: `@supabase/supabase-js`.
- No ORM (no Prisma, no Drizzle) unless explicitly approved in a reviewed spec.
- Authentication: Supabase Auth.
- Storage: Supabase Storage.
- Realtime: Supabase Realtime using Postgres Changes.
- AI: provider-agnostic adapter; provider choice/configuration is controlled by the approved AI spec.
- Payments: sandbox only unless a later approved spec explicitly changes this.
- Do not introduce infrastructure that is not required by the current phase.

### Frontend Supabase client

The frontend Supabase client uses the publishable key and may be used only for:

1. Supabase Auth
2. Supabase Storage uploads
3. Explicitly approved Supabase Realtime subscriptions

Do not use the frontend Supabase client for normal business-data CRUD.

All normal business-data reads and writes go through the Express API unless
the active module spec explicitly defines a direct Supabase read/subscription.

### Backend Supabase client

The Express backend uses the server-only secret key for database/business
operations. Never expose this key to the frontend.

---

## 2. Source of Truth & Precedence

When project documents appear to conflict, use this precedence order:

1. Current module spec in `docs/specs/`
2. `docs/data-model.md`
3. `docs/feature-plan.md`
4. `AGENTS.md` for engineering constraints
5. Existing implementation, only when consistent with the above

Never silently invent a new architecture to resolve a conflict.

If a contradiction or missing requirement is discovered, surface it in the
Plan Artifact before changing implementation or documentation.

Do not silently modify planning documents to make implementation easier.

---

## 3. Database & Migrations

- `supabase/migrations/*.sql` is the single source of truth for schema.
- No schema change is complete until the migration file exists and is committed to git.
- Never make undocumented schema changes directly in the Supabase Dashboard.
- Prefer the Supabase CLI migration workflow:
  `pnpm supabase migration new <name>`
- The Supabase MCP `apply_migration` tool changes the remote database but does
  not create the local migration file. If it is used, the matching migration
  file must also be created and committed.
- Never accept "the table exists in Supabase" as evidence that a schema change
  is complete.
- `pgvector` is enabled through tracked migrations, not manually through the Dashboard.
- Do not introduce Redis, a queue, worker infrastructure, or another job system
  unless a later approved module spec explicitly requires it.
- Do not use an ORM.

---

## 4. Authentication & Authorization

### Authentication

Use Supabase Auth directly from the frontend for:

- `signUp`
- `signInWithPassword`
- `signInWithOAuth`
- `signOut`
- `resetPasswordForEmail`

Do not reimplement these authentication flows as Express endpoints.

### Application identity and RBAC

- Supabase JWT authenticates the user identity.
- Express verifies the JWT and extracts the user id (`sub`).
- Cache JWKS public keys; do not fetch them on every request.
- Application role and status come from the live `profiles` lookup.
- Current application roles:
  - Admin
  - Supervisor
  - Researcher
- Current application statuses:
  - Active
  - PendingVerification
  - Suspended
- Do not use Supabase's built-in JWT `role` claim as the application role.
- Do not introduce a Custom Access Token Hook unless a future approved spec
  explicitly changes this architecture.

### Authorization

Authorization is enforced server-side in Express.

Never trust the frontend to determine:

- role
- status
- owner
- creator
- assignee authorization
- reviewer authorization
- approval state
- payment state
- audit actor
- other privileged fields

Never authorize an operation using role alone when a resource also has an
ownership, membership, project, reviewer, assignee, recipient, or provider scope.

Every protected mutation must verify:

1. authenticated user identity
2. account status
3. required application role
4. resource-specific ownership/access scope
5. valid state transition

---

## 5. Ownership & Access Scope

Ownership beats role.

Every resource must have an explicit, documented access path based on the
current data model:

- direct ownership
- project ownership
- project membership
- assignee
- reviewer assignment
- sender/recipient relationship
- booking/listing relationship
- Admin-only scope
- other explicitly documented scope

Examples:

- Project → owner/member
- Task → project + assignee/Supervisor
- Paper → uploader + shared-project scope
- Experiment → owner + supervised-project read scope
- Manuscript → author/project/reviewer assignment
- DirectMessage → sender/recipient only
- Listing → owner/booking participant
- Notification → recipient only

Do not assume every table needs `ownerId` or `projectId`. Follow the data model.

Do not trust client-supplied `ownerId`, `createdBy`, `reviewedBy`, or equivalent
identity fields. Derive acting-user identity from the verified JWT.

---

## 6. State Machines

- Status/state fields are enums or equivalent database constraints.
- Status transitions are controlled by backend business logic.
- Do not allow clients to arbitrarily set protected state values.
- Validate every transition against role, ownership/access scope, and current state.
- Invalid transitions must be rejected.
- Prefer explicit transition/service operations for security-sensitive workflows.

Examples include:

- Task: ToDo → InProgress → Submitted → UnderReview → Approved / RevisionRequested
- Manuscript: Draft → UnderInternalReview → Revising → Ready → Submitted → Published
- Booking/payment workflows
- Review comment workflows

---

## 7. API & Backend Structure

Keep route handlers thin.

Preferred flow:

Request
→ authentication middleware
→ role/status middleware
→ ownership/access guard
→ controller
→ service/business logic
→ Supabase data access

- Controllers adapt HTTP requests/responses.
- Services contain business rules and state transitions.
- Reusable authorization/access checks should live in middleware/guards/services,
  not be duplicated inconsistently across route handlers.
- Centralize Supabase server-client setup.
- Do not place complex business logic directly inside route declarations.

### API validation

Validate all:

- request bodies
- route parameters
- query parameters
- file metadata
- state-transition requests

Reject or ignore protected fields supplied by clients.

Protected fields must be derived or controlled server-side.

---

## 8. Secrets

- Never hard-code API keys or secrets.
- Never commit `.env` files.
- Never expose the Supabase secret key to the browser.
- Store the secret key only in the server environment.
- New Supabase projects use publishable/secret keys from the API Keys tab.
- Never place server credentials in frontend environment variables.

---

## 9. Realtime

- Use Supabase Realtime only where the module spec explicitly requires it.
- Realtime subscriptions must respect the same access boundaries as the underlying data.
- Express remains responsible for authorized writes.
- Never use Realtime as a bypass around application authorization.
- Project messages and Direct Messages must remain separate messaging systems.
- Listing inquiries must remain separate from project messages and Direct Messages.

---

## 10. Scope Discipline

- Work only on the current module/spec unless the Plan Artifact explicitly
  identifies a required cross-module dependency.
- Do not refactor unrelated modules.
- Reuse existing components, utilities, services, and patterns.
- Do not add a new dependency without explaining:
  - package name
  - reason
  - alternatives considered
  - affected workspace(s)
- Do not replace existing approved libraries without justification.
- Do not implement features marked out of scope.
- Do not add premature infrastructure.

---

## 11. Documentation Rules

Before implementing a feature:

1. Read `AGENTS.md`.
2. Read `docs/feature-plan.md`.
3. Read `docs/data-model.md`.
4. Read the current module spec in `docs/specs/`.
5. Inspect the existing implementation.

Every feature must have an explicit spec with acceptance criteria.

Never silently change permissions, ownership rules, entity relationships, or
state machines in code.

If the implementation exposes a contradiction or missing requirement, report it
in the Plan Artifact first.

---

## 12. Agent Workflow

For multi-file or architectural work:

1. Use Plan mode.
2. Produce a reviewable Plan Artifact.
3. Check affected files, dependencies, migrations, routes, authorization rules,
   and tests.
4. Ask for approval before execution when the operation is destructive or
   security-sensitive.
5. Execute only the approved scope.
6. Run relevant tests.
7. Walk through the acceptance criteria manually.
8. Review the final git diff.
9. Confirm migrations exist and are committed.
10. Commit only after verification.

Use Review-driven autonomy for:

- authentication
- RBAC
- authorization/ownership logic
- payment/escrow
- destructive database changes
- data deletion
- security-sensitive infrastructure changes

Use Fast mode only for low-risk isolated fixes such as:

- styling
- copy
- small UI fixes
- minor non-architectural bug fixes

---

## 13. Testing Rules

Every protected feature should include:

- happy-path tests
- unauthorized-role tests
- wrong-owner tests
- wrong-project/membership tests where applicable
- invalid-state-transition tests
- validation tests

For security-sensitive features, verify that forbidden operations return a
4xx response and do not mutate data.

For every module, verify the acceptance criteria from its spec.

For end-to-end workflows, prefer browser-in-the-loop verification where the
actual UI behavior matters.

---

## 14. Completion Rule

A feature is NOT complete merely because code compiles.

A feature is complete only when:

- implementation exists
- required migration exists
- authorization is tested
- relevant tests pass
- acceptance criteria are verified
- final diff is reviewed
- no undocumented schema changes exist
- required documentation remains consistent
- changes are committed to git

---

## 15. UI/UX Design & Frontend Rules

For any new page, dashboard, major component, or substantial UI redesign:

- Always read and apply the installed `ui-ux-pro-max` and Anthropic `frontend-design` skills.
- Preserve the ResearchOS information architecture and accessibility requirements.
- Do not let visual/frontend design skills override backend architecture, RBAC, data ownership, API contracts, or feature scope.
- Reuse the existing ResearchOS design system once established rather than inventing a new visual language for every page.