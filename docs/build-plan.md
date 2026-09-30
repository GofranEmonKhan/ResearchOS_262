# ResearchOS — Engineering Build Plan (Antigravity + Supabase Edition)

*Revision 4 — corrected after review: CLI installed as a project dependency (not global), the Supabase MCP's migration behavior described accurately, RBAC defaulting to a simple `profiles` lookup instead of a Custom Access Token Hook, and Supabase's key naming updated to the current publishable/secret format (replacing the legacy anon/service_role keys, which Supabase is deprecating by end of 2026).*

---

## 1. Final Tech Stack

```
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
```

### What changed in this revision, and why
- **Supabase CLI is a project devDependency, not a global install.** `npm install -g supabase` actually throws a hard error on current versions — the CLI intentionally disallows global npm/pnpm installs. Correct approach: `pnpm add -D supabase` inside the repo, then run everything as `pnpm supabase <command>`.
- **RBAC no longer depends on a Custom Access Token Hook by default.** The earlier plan put `role`/`status` into custom JWT claims via a Postgres hook Supabase calls at token-mint time. That's real infrastructure to configure correctly, and it has a genuine downside: a suspended user's *current* token keeps its stale claims until it expires or refreshes. The simpler default — Express verifies the JWT (confirms identity via the `sub` claim), then reads `profiles.role`/`profiles.status` with a normal query — has none of that staleness problem (suspension is immediate, since it's a live read) and is less for Antigravity to get right. The hook remains a legitimate later upgrade if you want Postgres RLS policies that reference role directly, or want to avoid one extra query per request at real scale — neither matters for a course project.
- **Supabase's built-in JWT `role` claim is not your app's role.** It's the Postgres access role (`anon` / `authenticated` / `service_role`). If a custom claim is added later, it must be named distinctly (`user_role`) and documented as such — conflating the two is an easy, consequential mistake.
- **Supabase's API key naming changed.** New projects should use the **publishable key** (`sb_publishable_...`) on the frontend and the **secret key** (`sb_secret_...`) on the backend — these replace the legacy `anon`/`service_role` JWT keys, which Supabase's own docs say will be deprecated by end of 2026. Functionally identical privilege levels (publishable = same low privilege as anon; secret = same elevated, RLS-bypassing privilege as service_role), so nothing about the architecture below changes — only the names, and one added guardrail: the new secret key format is rejected outright if a request looks like it came from a browser, which the old service_role JWT never checked.
- **The Supabase MCP's `apply_migration` tool does not write to your local repo.** It calls the Supabase Management API and applies SQL directly to the remote database, tracked only in a remote table (`supabase_migrations.schema_migrations`). It does not create a file in `supabase/migrations/` and does not touch git. Treating it as if it did creates silent drift between what's live and what's in version control. See §4 for the corrected workflow.

### Why no ORM (unchanged from the prior revision)
Supabase replaces Prisma's two jobs natively: **migrations** via `supabase/migrations/*.sql` + `supabase db push`, and **types** via `supabase gen types typescript`. Queries go through the `supabase-js` builder in Express, fully typed against the generated types. The one real technical trade-off: pgvector's distance operators need a Postgres function called via `.rpc()` rather than a builder chain — budget for a handful of hand-written SQL functions for joins/aggregations and vector search, rather than assuming everything is expressible as `.select().eq()...`.

---

## 2. Repository Structure

```
researchos/
├── apps/
│   ├── web/                 # React frontend — publishable-key Supabase client, calls Express for business logic
│   └── api/                 # Express backend — secret-key Supabase client, RBAC middleware
├── packages/
│   ├── shared-types/        # generated Supabase types + hand-written DTOs/enums shared FE/BE
│   └── config/               # shared eslint/tsconfig/tailwind config
├── supabase/
│   ├── migrations/          # SQL migration files — the single source of schema truth
│   ├── config.toml
│   └── seed.sql
├── docs/
│   ├── feature-plan.md
│   ├── build-plan.md
│   ├── data-model.md
│   └── specs/
├── AGENTS.md                 # cross-tool agent rules, read by Antigravity at session start
├── package.json               # includes "supabase" as a devDependency
└── pnpm-workspace.yaml
```

Two corrections from the prior revision: the rules file is **`AGENTS.md` at the project root**, not `.antigravity/rules.md` — that's the actual convention Antigravity (and Cursor, Claude Code, Codex) reads at session start. Antigravity may also support a workspace-scoped rules subfolder for tool-specific settings; check the in-app **⋯ → Customizations → Rules** panel on your installed version for the exact path, since that layer is still visibly evolving across Antigravity's public-preview documentation. `AGENTS.md` at the root is the well-corroborated one to rely on.

The `supabase` CLI package now shows up as a real `devDependency` in the root `package.json` — that's expected and correct, not a leftover.

---

## 3. Data Model
Full entity-by-entity spec lives in `docs/data-model.md`. Same ~59 entities. Module 1 (Auth) was revised in this pass: the `profiles` table and RBAC lookup pattern are unchanged in shape, but the mechanism for getting role/status into Express is now a direct table read instead of a JWT custom claim — see that doc for the corrected version.

---

## 4. How to brief Antigravity

**Connect the Supabase MCP server** (⋯ → Manage MCP Servers → paste the `mcp.supabase.com/mcp` config, authenticate via the browser popup). Corrected usage rules, now that the migration behavior is understood accurately:

- **`supabase/migrations/*.sql` is the only source of schema truth.** A schema change isn't done until a migration file exists there and is committed — full stop.
- **If Antigravity uses the MCP's schema tools, it must also create the matching local file.** The safe instruction to give it: *"Create a new migration file with `pnpm supabase migration new <name>`, write the SQL into that file, then apply it locally with `db reset` or push it with `db push` — don't call `apply_migration` directly without a corresponding file existing in git."* This avoids the drift the earlier plan didn't account for.
- **Use the MCP's read tools freely** — inspecting schema/data, running ad-hoc SQL for debugging, generating TypeScript types, checking logs. These don't create drift risk.
- Keep the MCP scoped to your project (`--project-ref`) and **keep manual tool-approval on** for it specifically, even in Agent-assisted mode generally.

**Agent mode per task type** (unchanged):
| Task | Antigravity mode | Why |
|---|---|---|
| New module scaffolding (routes, tables, CRUD) | Plan mode, Agent-assisted autonomy | Multi-file, review the plan before it runs |
| RBAC middleware, payment/escrow logic | Plan mode, Review-driven autonomy | High blast radius if wrong |
| Small fixes, styling, copy | Fast mode | Low risk |
| E2E flow verification | Manager surface, browser-in-the-loop | Drives the real UI against acceptance criteria |

---

## 5. Build Order

**Phase 0 — Foundation**
Supabase project creation, CLI installed as devDependency, `supabase login`/`link`, monorepo scaffold, first migration (pgvector), CI skeleton, MCP connection. See `docs/specs/00-foundation.md`.

**Phase 1 — Auth + RBAC + role dashboards (skeleton)**
Supabase Auth (email/password + Google OAuth), `profiles` table + trigger from `auth.users`, Express RBAC middleware reading `profiles.role`/`status` per request, Supervisor pending-verification workflow, empty dashboard shells per role. See `docs/specs/01-auth-rbac.md`.

**Phase 2 — Research Workspace**
Projects, Milestones, Tasks, Kanban, approval workflow, notifications, project chat via Supabase Realtime.

**Phase 3 — Literature Manager**
Upload to Supabase Storage + CrossRef metadata fetch, PDF viewer with highlight-to-sidebar, sidebar fields, visibility toggle, BibTeX export.

**Phase 4 — Experiment Tracker**
CRUD, compare view, lock-on-Final, flagging.

**Phase 5 — Writing & Review**
Manuscript editor (Tiptap), citation insert, review assignment, comment resolution state machine, reference list generation.

**Phase 6 — Forum + DM**
Posts/answers/votes, reputation, DM, block/report, moderation queue.

**Phase 7 — Marketplace**
Listings, booking + escrow state machine, Stripe sandbox, admin approval/dispute flow.

**Phase 8 — AI Assistant layer**
pgvector-backed embeddings, summarization, semantic search via `.rpc()`, citation-purpose suggestion, Admin quota/provider config. Revisit BullMQ+Redis here only if synchronous embedding generation proves too slow.

**Phase 9 — Admin console, analytics, QA**
Aggregate dashboards, moderation console, audit trail views, security pass (rate limiting, input validation, Storage signed URLs, RLS policies on any table/bucket the frontend touches directly).

---

## 6. Testing & Verification Strategy
Unchanged: Vitest/Jest unit tests for the permission matrix, Supertest for API contracts, Antigravity's browser-in-the-loop for scripted role-based E2E flows. Still worth a light RLS-policy check wherever a module has the frontend talking to Storage/Realtime directly.

---

## 7. Suggested Timeline
Unchanged from the prior revision — Phase 1 may run slightly faster still, since a `profiles` lookup is simpler to build and debug than a JWT hook.

| Phase | Est. duration |
|---|---|
| 0 — Foundation | 1–2 days |
| 1 — Auth/RBAC | 3–4 days |
| 2 — Research Workspace | 2 weeks |
| 3 — Literature Manager | 1.5 weeks |
| 4 — Experiment Tracker | 1 week |
| 5 — Writing & Review | 1.5–2 weeks |
| 6 — Forum + DM | 1 week |
| 7 — Marketplace | 1.5 weeks |
| 8 — AI layer | 1 week |
| 9 — Admin/QA/polish | 1 week |

---

## 8. Open Decisions Still Worth Making
1. **UI kit**: Tailwind+shadcn vs. MUI-only.
2. **Deployment target**: Railway/Render/Fly.io for `apps/api`/`apps/web`.
3. **SSLCOMMERZ vs Stripe** for the marketplace module.
4. **Rich text editor**: Tiptap vs. Lexical for manuscripts.
5. **When (if ever) to add the Custom Access Token Hook** — revisit once/if you want role-aware RLS policies as defense-in-depth, not before.
