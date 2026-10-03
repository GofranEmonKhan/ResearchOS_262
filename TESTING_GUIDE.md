# ResearchOS — Comprehensive Testing & Test Execution Guide

> **Welcome!** If you are on a new computer or new to this project, this guide provides complete, step-by-step instructions to set up your environment and run all test suites across the ResearchOS repository.

---

## 1. Prerequisites (Setup on a New PC)

Before running the test scripts, ensure the following tools are installed on your machine:

### Step 1.1: Install Node.js
- ResearchOS requires **Node.js v20.x or higher** (LTS recommended).
- **Download**: [https://nodejs.org](https://nodejs.org)
- **Verify installation** (Open Terminal / PowerShell / Command Prompt):
  ```bash
  node -v
  npm -v
  ```

### Step 1.2: Install pnpm (Package Manager)
ResearchOS is a monorepo managed with `pnpm`.
- Install pnpm globally using npm or corepack:
  ```bash
  npm install -g pnpm
  ```
  *(Alternative using Node Corepack)*:
  ```bash
  corepack enable
  corepack prepare pnpm@latest --activate
  ```
- **Verify installation**:
  ```bash
  pnpm -v
  ```

### Step 1.3: Windows PowerShell Execution Policy (Windows Users Only)
If you get an error in Windows PowerShell saying `running scripts is disabled on this system`, run this command once in PowerShell:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### Step 1.4: Install Project Dependencies
Navigate to the root directory of the project and run:
```bash
pnpm install
```
This will automatically install all required packages and link shared workspaces (`@researchos/web`, `@researchos/api`, `@researchos/shared-types`).

---

## 2. Directory Structure of Test Scripts

All test scripts are organized inside the `apps/` directory divided by workspace:

```
ResearchOS/
├── apps/
│   ├── web/                              # Frontend React + Vite Workspace
│   │   └── src/
│   │       └── tests/                    # Frontend UI & Component Test Suites (94 tests)
│   │           ├── admin-console-ui.test.tsx
│   │           ├── auth-rbac-ui.test.tsx
│   │           ├── community-ui.test.tsx
│   │           ├── experiment-tracker-ui.test.tsx
│   │           ├── landing-page.test.tsx
│   │           ├── literature-ui.test.tsx
│   │           ├── manuscript-ui.test.tsx
│   │           └── workspace-layout.test.tsx
│   │
│   └── api/                              # Backend Express + Node.js Workspace
│       └── src/
│           └── tests/                    # Backend API, RBAC & Service Test Suites (13 suites)
│               ├── admin-console.test.ts
│               ├── ai-assistant.test.ts
│               ├── auth-rbac.test.ts
│               ├── experiment-contracts.test.ts
│               ├── experiment.test.ts
│               ├── forum-community-contracts.test.ts
│               ├── forum-community.test.ts
│               ├── literature-discovery.test.ts
│               ├── literature-rls.test.ts
│               ├── literature.test.ts
│               ├── manuscript.test.ts
│               ├── marketplace.test.ts
│               └── workspace.test.ts
```

---

## 3. Quick-Start Test Commands

Open a terminal in the root folder (`ResearchOS`):

| Goal | Command |
| :--- | :--- |
| **Run All Frontend Web UI Tests** | `pnpm --filter @researchos/web test -- --run` |
| **Run All Backend API Tests** | `pnpm --filter @researchos/api test` |
| **Run Typecheck Across Whole Repo** | `pnpm typecheck` |
| **Run Entire Test Suite (All Workspaces)** | `pnpm test` |

---

## 4. Running Frontend Web UI Tests (`apps/web`)

The frontend test suite validates UI rendering, user roles, navigation tabs, modals, preview engines, and interactive components using Node's native test runner + `tsx`.

### 4.1 Run All Web UI Tests (Recommended)
From the project root:
```bash
pnpm --filter @researchos/web test -- --run
```
*Or navigate into `apps/web` first:*
```bash
cd apps/web
pnpm test -- --run
```

### 4.2 Run a Specific Web Test File
You can run individual UI test files by passing their relative path to `npx tsx --test`:

```bash
# Test 1: Admin Console, Governance & AI Config Tabs
pnpm --filter @researchos/web exec tsx --test src/tests/admin-console-ui.test.tsx

# Test 2: Auth, User Profiles, Registration & RBAC UI
pnpm --filter @researchos/web exec tsx --test src/tests/auth-rbac-ui.test.tsx

# Test 3: Discussion Forum & Community UI
pnpm --filter @researchos/web exec tsx --test src/tests/community-ui.test.tsx

# Test 4: Experiment Tracker, Python WASM Playground & Visualizer UI
pnpm --filter @researchos/web exec tsx --test src/tests/experiment-tracker-ui.test.tsx

# Test 5: Landing Page, Simulator & Public Showcase UI
pnpm --filter @researchos/web exec tsx --test src/tests/landing-page.test.tsx

# Test 6: Literature Review, PDF Reader & Smart Sidebar UI
pnpm --filter @researchos/web exec tsx --test src/tests/literature-ui.test.tsx

# Test 7: Manuscript Writing, LaTeX Preview & Peer Review UI
pnpm --filter @researchos/web exec tsx --test src/tests/manuscript-ui.test.tsx

# Test 8: Workspace Layout, Milestones, Roadmaps & Kanban UI
pnpm --filter @researchos/web exec tsx --test src/tests/workspace-layout.test.tsx
```

---

## 5. Running Backend API & Service Tests (`apps/api`)

The backend test suite validates RBAC permissions, state machine transitions, SQL/RLS policies, and endpoint security.

### 5.1 Run All API Tests
From the project root:
```bash
pnpm --filter @researchos/api test
```

### 5.2 Run Specific API Module Tests
Preconfigured npm scripts in `apps/api`:
```bash
# Marketplace & Escrow Booking tests
pnpm --filter @researchos/api test:marketplace

# AI Assistant & Quotas tests
pnpm --filter @researchos/api test:ai

# AI Literature Discovery & ArXiv/PubMed integration tests
pnpm --filter @researchos/api test:discovery

# Admin Governance & Audit Logs tests
pnpm --filter @researchos/api test:admin
```

### 5.3 Run an Individual API Test File Directly
```bash
# Authentication & Role Checks
pnpm --filter @researchos/api exec tsx --test src/tests/auth-rbac.test.ts

# Workspace & Project Security
pnpm --filter @researchos/api exec tsx --test src/tests/workspace.test.ts

# Literature RLS & Isolation
pnpm --filter @researchos/api exec tsx --test src/tests/literature-rls.test.ts

# Experiment Tracking & Benchmarks
pnpm --filter @researchos/api exec tsx --test src/tests/experiment.test.ts

# Forum & Community Disputation
pnpm --filter @researchos/api exec tsx --test src/tests/forum-community.test.ts

# Manuscript & Versioning
pnpm --filter @researchos/api exec tsx --test src/tests/manuscript.test.ts
```

---

## 6. Detailed Test Suite Directory & Coverage Reference

### 6.1 Frontend Test Files (`apps/web/src/tests/`)

| File Name | Test Count | Key Features Validated |
| :--- | :---: | :--- |
| [`admin-console-ui.test.tsx`](file:///apps/web/src/tests/admin-console-ui.test.tsx) | 6 | Admin command center header, active status badge, all 7 navigation tabs, overview KPI cards, moderation queues, user inspection modal, verification modal, and role mutation forms. |
| [`auth-rbac-ui.test.tsx`](file:///apps/web/src/tests/auth-rbac-ui.test.tsx) | 6 | Login modal, role selection (Researcher vs Supervisor), registration fields, supervisor verification alerts, protected route guards, and suspended account states. |
| [`community-ui.test.tsx`](file:///apps/web/src/tests/community-ui.test.tsx) | 8 | Community hub layout, tab navigation, post creation modal, screenshot attachments, comment rendering, upvoting/downvoting badges, and report disputation triggers. |
| [`experiment-tracker-ui.test.tsx`](file:///apps/web/src/tests/experiment-tracker-ui.test.tsx) | 16 | Experiment card rendering, locked benchmark cards, supervisor review flags, comparison matrix modal, graphical visualizer, Python WASM Code Playground, file tree explorer, editor tabs, and dataset uploaders. |
| [`landing-page.test.tsx`](file:///apps/web/src/tests/landing-page.test.tsx) | 12 | Brand navbar, hero serif typography, DOI search pill, 3-column Live Research Workbench Simulator, Bento Grid module cards, Role Switcher, Pricing tiers, Blog reader modal, and DOI preview modal. |
| [`literature-ui.test.tsx`](file:///apps/web/src/tests/literature-ui.test.tsx) | 11 | Collection sidebar, active collection highlight, paper metadata cards, reading status pills, PDF upload dropzone, metadata editing modal, cross-project sharing, annotation highlighter popover, sticky notes, and AI Structured Synthesis sidebar. |
| [`manuscript-ui.test.tsx`](file:///apps/web/src/tests/manuscript-ui.test.tsx) | 16 | Manuscript creation wizard, IMRAD structure generator, citation search modal, peer review comment drawer with severity badges, supervisor verification buttons, submission checklist, version history snapshots, LaTeX preview rendering, figure cards, and figure assets manager. |
| [`workspace-layout.test.tsx`](file:///apps/web/src/tests/workspace-layout.test.tsx) | 14 | Responsive sidebar expansion, top header status pills, collaborative task proposal badges, Kanban board columns, Research Journey Milestone Roadmap, Workspace Calendar, supervisor review approval modals, member invitations, and notification center. |

---

### 6.2 Backend Test Files (`apps/api/src/tests/`)

| File Name | Key Backend Capabilities Validated |
| :--- | :--- |
| [`admin-console.test.ts`](file:///apps/api/src/tests/admin-console.test.ts) | Admin role authorization, platform KPI aggregation, user suspension/reactivation, verification review queue approval/rejection, audit log querying, and system health status. |
| [`ai-assistant.test.ts`](file:///apps/api/src/tests/ai-assistant.test.ts) | Agnostic provider adapter switching (Gemini / OpenAI), token quota enforcement by role, substring content policy filtering, and usage telemetry recording. |
| [`auth-rbac.test.ts`](file:///apps/api/src/tests/auth-rbac.test.ts) | Supabase JWT verification, `profiles` table RBAC lookup, role assignment (Researcher, Supervisor, Admin), and status enforcement (Active, PendingVerification, Suspended). |
| [`experiment-contracts.test.ts`](file:///apps/api/src/tests/experiment-contracts.test.ts) | JSON schema validation for experiment parameters, metric payloads, dataset metadata, and code run snapshot structures. |
| [`experiment.test.ts`](file:///apps/api/src/tests/experiment.test.ts) | CRUD operations on experiments, immutable finalized benchmark locking, supervisor flag creation, and benchmark comparison endpoints. |
| [`forum-community-contracts.test.ts`](file:///apps/api/src/tests/forum-community-contracts.test.ts) | Post and comment contract schemas, voting payload formats, and report reason definitions. |
| [`forum-community.test.ts`](file:///apps/api/src/tests/forum-community.test.ts) | Community post creation, category filtering, vote weight calculation, threaded comment replies, and content moderation. |
| [`literature-discovery.test.ts`](file:///apps/api/src/tests/literature-discovery.test.ts) | Semantic paper search, arXiv & PubMed live metadata ingestion, abstract parsing, and AI gap extraction. |
| [`literature-rls.test.ts`](file:///apps/api/src/tests/literature-rls.test.ts) | Row Level Security (RLS) isolation ensuring researchers only access papers within permitted project scopes. |
| [`literature.test.ts`](file:///apps/api/src/tests/literature.test.ts) | PDF parsing, metadata extraction, collections CRUD, annotations, highlights, and cross-project paper sharing. |
| [`manuscript.test.ts`](file:///apps/api/src/tests/manuscript.test.ts) | Manuscript state machine (Draft → UnderInternalReview → Revising → Ready → Submitted → Published), LaTeX compilation contracts, inline comments, and version snapshots. |
| [`marketplace.test.ts`](file:///apps/api/src/tests/marketplace.test.ts) | Equipment and lab service listings, escrow booking lifecycle, provider confirmation, and dispute resolution. |
| [`workspace.test.ts`](file:///apps/api/src/tests/workspace.test.ts) | Project ownership, team membership roles, task Kanban state transitions, milestone roadmap stages, and calendar schedule integrity. |

---

## 7. Understanding Test Outputs

### Successful Run Example:
```
▶ Spec 02 — Workspace Layout & Navigation UI Tests
  ✔ 1. AppSidebar renders in collapsed mode by default (21.76ms)
  ✔ 2. AppSidebar renders expanded width on hover (17.82ms)
  ...
ℹ tests 94
ℹ suites 8
ℹ pass 94
ℹ fail 0
ℹ duration_ms 5304.01
```
- `pass 94`: All 94 tests in the suite executed and assertions succeeded.
- `fail 0`: No errors encountered.

### Failed Test Troubleshooting:
If any test reports a failure:
1. Look at the stack trace line starting with `AssertionError`.
2. It will state the exact expected vs actual value:
   ```
   AssertionError [ERR_ASSERTION]: Must render Tab 7: AI Platform Config
   ```
3. Check the file path and line number indicated in the error to inspect the component or endpoint under test.

---

## 8. Common Troubleshooting Q&A

**Q: `pnpm: command not found`**  
**A:** Run `npm install -g pnpm` in your terminal, then close and reopen your terminal window.

**Q: `Error: Cannot find module '@researchos/shared-types'`**  
**A:** Run `pnpm build` or `pnpm install` from the root directory so pnpm can link the local packages.

**Q: `TypeScript errors during typecheck`**  
**A:** Run `pnpm typecheck` to view specific TypeScript compiler errors and line numbers across all workspaces.
