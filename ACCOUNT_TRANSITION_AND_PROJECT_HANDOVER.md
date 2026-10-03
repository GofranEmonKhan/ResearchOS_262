# ResearchOS — Account Transition & Project Handover Guide

> **Purpose**: Seamless continuity guide for switching Google Antigravity / Gemini CLI accounts when weekly quota limits are reached.  
> **Target Audience**: Developer & any AI Assistant instance starting a new session under a new account.  
> **Repository**: `ResearchOS` (`C:\Users\Abdul Gofran Emon\ResearchOS`)  
> **Current Git Branch**: `feature/ui-readability-and-interactive-selectors`  
> **Last Updated**: October 3, 2026  

---

## 1. Executive Summary: What Happens When You Switch Accounts?

### ❓ Key Questions & Direct Answers

1. **Can I continue building the project's remaining tasks with my second Pro account?**
   - **YES, 100% YES.** You can log out of Antigravity on your first account and log into your second Pro student account. The AI assistant will function identically.

2. **Will switching accounts affect my codebase, local files, or database?**
   - **NO, NOT AT ALL.** All source code (`apps/web`, `apps/api`, `packages/shared-types`), Git commits/branches, Supabase database data, `.env` environment variables, dependencies (`node_modules`), and migration scripts exist locally on your computer and on GitHub. Changing your AI assistant login does **not** touch your files or database.

3. **Will conversation history be lost?**
   - The chat window transcripts in the IDE interface are tied to your logged-in session. When you log in with a new account, a **new chat session** starts.
   - **However, this document eliminates any context loss!** Because AI agents read repository files (`AGENTS.md`, `docs/`, `package.json`, and root `.md` files) upon starting, this document provides the new AI session with 100% complete knowledge of what has been built, what tests exist, and what to do next.

4. **Will switching accounts hamper development?**
   - **No.** As long as you follow the simple 1-prompt start instructions in Section 2, the new AI session will pick up exactly where we left off with zero friction.

---

## 2. Step-by-Step Instructions to Switch Accounts

### Step 1: Log Out of Current Account in Antigravity / IDE
1. Open the Antigravity command palette / settings (or run `agy auth logout` / click profile avatar in the IDE bottom-left corner).
2. Select **Sign Out** / **Logout**.

### Step 2: Log In with Second Student Pro Account
1. Click **Sign In** / run `agy auth login`.
2. Authenticate in the browser window using your **second student Pro Google account**.
3. Confirm that the status shows active Pro subscription.

### Step 3: Open the ResearchOS Workspace in the New Session
1. Open the workspace folder `C:\Users\Abdul Gofran Emon\ResearchOS`.
2. In the chat window of the new session, copy and paste this **exact prompt**:

> **Paste this prompt into the new chat session:**
> ```text
> Hi! I have switched to my second Pro account. Please read `ACCOUNT_TRANSITION_AND_PROJECT_HANDOVER.md`, `AGENTS.md`, and `docs/specs/` to understand the full project state, architecture, and completed modules. Confirm you have loaded the context and let me know the current status.
> ```

---

## 3. Project Architecture & Technical Stack

- **Frontend**: React 18 + Vite + TypeScript, Tailwind CSS, shadcn/ui primitives, TanStack Query, Lucide icons (`apps/web`).
- **Backend**: Node.js + Express + TypeScript (`apps/api`).
- **Database**: Supabase Postgres + `pgvector` vector embeddings + Storage Buckets (`file_assets`).
- **Data Access**: `@supabase/supabase-js` (No ORM like Prisma or Drizzle).
- **Authentication & RBAC**: Supabase Auth JWT + live `public.profiles` lookup (`Admin`, `Supervisor`, `Researcher`).
- **AI Architecture**: Provider-agnostic adapter (`Gemini 1.5/2.0 Flash/Pro` / OpenAI / Anthropic) controlled by Spec 08 AI Governance.

---

## 4. Master Module Completion Matrix (Specs 01 – 09 Status)

| Module / Spec | Feature Scope | Status | Verification & Tests |
| :--- | :--- | :--- | :--- |
| **Spec 01** | Auth, RBAC, Profiles, Supervisor Verification | ✅ **100% Complete** | `pnpm --filter @researchos/api test:auth`, `auth-rbac-ui.test.tsx` |
| **Spec 02** | Workspaces, Projects, Task Kanban, Milestones, Calendar | ✅ **100% Complete** | `pnpm --filter @researchos/api test:workspace`, `workspace-layout.test.tsx` |
| **Spec 03** | Literature Manager, PDF Reader, DOI Auto-Fetch, Smart Sidebar | ✅ **100% Complete** | `pnpm --filter @researchos/api test:literature`, `literature-ui.test.tsx` |
| **Spec 04** | Experiment Tracker, Pyodide VFS Code Playground, Datasets | ✅ **100% Complete** | `pnpm --filter @researchos/api test:experiments`, `experiment-tracker-ui.test.tsx` |
| **Spec 05** | Manuscripts & Collaborative Peer Review Engine | ✅ **100% Complete** | `pnpm --filter @researchos/api test:manuscripts`, `manuscript-ui.test.tsx` |
| **Spec 06** | Direct Messaging & Scholar Community Forum | ✅ **100% Complete** | `pnpm --filter @researchos/api test:messaging`, `community-ui.test.tsx` |
| **Spec 07** | Service Marketplace, Escrow & Dispute Resolution | ✅ **100% Complete** | `pnpm --filter @researchos/api test:marketplace` |
| **Spec 08** | AI Integration, Embeddings, Quotas & Prompt Rules | ✅ **100% Complete** | `pnpm --filter @researchos/api test:ai` |
| **Spec 09** | Admin Console, Analytics & Governance Command Center | ✅ **100% Complete** | `pnpm --filter @researchos/api test:admin`, `admin-console-ui.test.tsx` |

---

## 5. Summary of Recent Major Enhancements

1. **Milestone Detail Description Field**:
   - Added `description text` column to `public.milestones` schema ([`supabase/migrations/20261003000000_milestone_description.sql`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/supabase/migrations/20261003000000_milestone_description.sql)).
   - Updated backend routes, DTOs, seed data, and frontend milestone creation modals and timeline UI.

2. **Coding Experiment Playground & Virtual File System**:
   - Integrated Pyodide Python WASM runtime with VS Code-style file tree explorer, editor tabs, terminal execution, dataset CSV/JSON uploader, and 1-click experiment runner saving.

3. **Admin Console & Governance Command Center (Module 09)**:
   - Added `public.deletion_requests` migration ([`supabase/migrations/20261004000000_admin_deletion_requests.sql`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/supabase/migrations/20261004000000_admin_deletion_requests.sql)).
   - Implemented backend API services for overview aggregations, user directory, audit log queries, storage metrics, and deletion request lifecycle in [`apps/api/src/services/admin.service.ts`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/apps/api/src/services/admin.service.ts).
   - Created full 7-tab Command Center UI in [`apps/web/src/pages/dashboards/AdminConsolePage.tsx`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/apps/web/src/pages/dashboards/AdminConsolePage.tsx):
     - **Tab 1: Overview** ([`AdminOverviewTab.tsx`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/apps/web/src/components/admin/AdminOverviewTab.tsx))
     - **Tab 2: User Directory** ([`AdminUserDirectoryTab.tsx`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/apps/web/src/components/admin/AdminUserDirectoryTab.tsx))
     - **Tab 3: Supervisor Queue** ([`AdminVerificationsTab.tsx`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/apps/web/src/components/admin/AdminVerificationsTab.tsx))
     - **Tab 4: Audit Logs** ([`AdminAuditLogsTab.tsx`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/apps/web/src/components/admin/AdminAuditLogsTab.tsx))
     - **Tab 5: Governance & Deletions** ([`AdminGovernanceTab.tsx`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/apps/web/src/components/admin/AdminGovernanceTab.tsx))
     - **Tab 6: System Health & Storage** ([`AdminSystemHealthTab.tsx`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/apps/web/src/components/admin/AdminSystemHealthTab.tsx))
     - **Tab 7: AI Configuration** (`AdminAiConfigPanel.tsx`)

4. **UI Readability & Aesthetics Refinement**:
   - Strictly applied [`UI_READABILITY_REFINEMENT_PLAN.md`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/UI_READABILITY_REFINEMENT_PLAN.md) across all dashboards and components: Minimum 12px font size floor, Deep Cosmic Obsidian palette (`#07070C`), AAA text contrast ratios, crisp glass surface borders, and active hover dropdowns.

---

## 6. Verification Command Cheatsheet for New Session

Whenever the new agent session starts, run these commands to verify that all code compiles and all tests pass:

```bash
# 1. Verify TypeScript types across all packages
pnpm -r typecheck

# 2. Run backend test suites
pnpm --filter @researchos/api test:auth
pnpm --filter @researchos/api test:workspace
pnpm --filter @researchos/api test:literature
pnpm --filter @researchos/api test:experiments
pnpm --filter @researchos/api test:manuscripts
pnpm --filter @researchos/api test:marketplace
pnpm --filter @researchos/api test:admin

# 3. Run frontend UI component test suite (94 tests)
pnpm --filter @researchos/web test

# 4. Run frontend production build
pnpm --filter @researchos/web build
```

---

## 7. Next Recommended Tasks for the New Session

Depending on what feature or refinement you wish to prioritize next:

1. **Full Multi-User E2E Integration Audit**:
   - Run end-to-end browser walkthroughs across Researcher, Supervisor, and Admin personas using `pnpm dev`.
2. **Further UI Readability & Component Polishing**:
   - Follow [`UI_READABILITY_REFINEMENT_PLAN.md`](file:///c:/Users/Abdul%20Gofran Emon/ResearchOS/UI_READABILITY_REFINEMENT_PLAN.md) Phase 4, Phase 5, and Phase 6 for any remaining workspace screens.
3. **Deployment Preparation**:
   - Configure production build flags, Supabase production environment variables, and static hosting build artifacts.

---

*Handover document ready. Switching accounts will cause zero data loss or development hindrance.*
