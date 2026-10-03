# 🧪 ResearchOS — Complete Beginner's Guide: How to Run All Test Cases

> **Hey there! 👋**  
> If you just downloaded or cloned this project on your computer and have **never run tests or code before**, don't worry! This guide is written specifically for you. Follow these steps one-by-one from top to bottom.

---

## 📌 Table of Contents
1. [What Are These Tests?](#1-what-are-these-tests)
2. [Step 1: Install Required Software (First-Time Setup)](#2-step-1-install-required-software-first-time-setup)
3. [Step 2: Open the Terminal in the Project Folder](#3-step-2-open-the-terminal-in-the-project-folder)
4. [Step 3: Setup Package Manager (`pnpm`) & Install Project Dependencies](#4-step-3-setup-package-manager-pnpm--install-project-dependencies)
5. [Step 4: Where Are the Test Files Located? (Directory Structure)](#5-step-4-where-are-the-test-files-located-directory-structure)
6. [Step 5: How to Run the Test Scripts (The Commands)](#6-step-5-how-to-run-the-test-scripts-the-commands)
   - [Run All Frontend Tests (Recommended)](#51-run-all-frontend-ui-tests-recommended)
   - [Run One Specific Test File](#52-run-a-single-specific-test-file)
   - [Run All Backend API Tests](#53-run-all-backend-api-tests)
   - [Run Entire Workspace Suite](#54-run-the-entire-test-suite)
7. [Step 6: Complete List of Test Files & What Each Does](#7-step-6-complete-list-of-test-files--what-each-does)
8. [Step 7: Understanding the Output (Pass vs Fail)](#8-step-7-understanding-the-output-pass-vs-fail)
9. [Step 8: Troubleshooting & Common Beginner Errors](#9-step-8-troubleshooting--common-beginner-errors)

---

## 1. What Are These Tests?

In this project, test files contain automated scripts that simulate user actions (clicking buttons, loading pages, verifying user roles, testing security rules, and running Python code environments). 

When you run a test script, it automatically checks whether each feature is working properly and prints a green checkmark `✔` if it works, or a red `✖` if something is broken.

---

## 2. Step 1: Install Required Software (First-Time Setup)

If your computer is completely fresh, you need two free tools installed:

### 1.1 Install Node.js
- Node.js is the engine that executes JavaScript and TypeScript.
- **Download Link**: [https://nodejs.org](https://nodejs.org) (Choose the **LTS** version).
- Download the installer (`.msi` on Windows or `.pkg` on Mac), double-click it, click **Next** through all prompts, and finish installation.

### 1.2 Install Git (if not already installed)
- **Download Link**: [https://git-scm.com/downloads](https://git-scm.com/downloads)
- Download and install with default settings.

---

## 3. Step 2: Open the Terminal in the Project Folder

1. Open **VS Code** (or your file manager).
2. Open the `ResearchOS` folder in VS Code (`File` ➔ `Open Folder...` ➔ select `ResearchOS`).
3. Open the built-in terminal by pressing:
   - **Windows / Linux**: `Ctrl + ~` (Control + backtick) or top menu `Terminal` ➔ `New Terminal`.
   - **Mac**: `Cmd + ~` or top menu `Terminal` ➔ `New Terminal`.

You should see a command prompt showing the path ending in `ResearchOS`.

---

## 4. Step 3: Setup Package Manager (`pnpm`) & Install Project Dependencies

Run the following commands in your terminal **in order**:

### Step 3.1: Windows PowerShell Security Fix (Windows users only)
If you are on Windows, PowerShell might block script execution by default. Run this command once:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```
*(When prompted, type `Y` and press Enter).*

### Step 3.2: Install `pnpm`
ResearchOS uses `pnpm` to manage multiple project packages. Install it by running:
```bash
npm install -g pnpm
```

### Step 3.3: Verify Installation
Check that both Node and pnpm are ready:
```bash
node -v
pnpm -v
```
*(You should see version numbers like `v20.x.x` and `9.x.x` or `10.x.x`).*

### Step 3.4: Install Dependencies
Run this command from the root `ResearchOS` directory:
```bash
pnpm install
```
> ⏳ *Wait 1–2 minutes while pnpm downloads all required libraries.*

---

## 5. Step 4: Where Are the Test Files Located? (Directory Structure)

All test scripts live inside the `src/tests/` folders in each app:

```text
📁 ResearchOS/                                  <-- Root project directory
│
├── 📁 apps/
│   │
│   ├── 📁 web/                                 <-- FRONTEND (React + Vite UI)
│   │   └── 📁 src/
│   │       └── 📁 tests/                       <-- 8 FRONTEND TEST SUITES (94 TESTS)
│   │           ├── 📄 admin-console-ui.test.tsx
│   │           ├── 📄 auth-rbac-ui.test.tsx
│   │           ├── 📄 community-ui.test.tsx
│   │           ├── 📄 experiment-tracker-ui.test.tsx
│   │           ├── 📄 landing-page.test.tsx
│   │           ├── 📄 literature-ui.test.tsx
│   │           ├── 📄 manuscript-ui.test.tsx
│   │           └── 📄 workspace-layout.test.tsx
│   │
│   └── 📁 api/                                 <-- BACKEND (Node.js + Express)
│       └── 📁 src/
│           └── 📁 tests/                       <-- 13 BACKEND API TEST SUITES
│               ├── 📄 admin-console.test.ts
│               ├── 📄 ai-assistant.test.ts
│               ├── 📄 auth-rbac.test.ts
│               ├── 📄 experiment-contracts.test.ts
│               ├── 📄 experiment.test.ts
│               ├── 📄 forum-community-contracts.test.ts
│               ├── 📄 forum-community.test.ts
│               ├── 📄 literature-discovery.test.ts
│               ├── 📄 literature-rls.test.ts
│               ├── 📄 literature.test.ts
│               ├── 📄 manuscript.test.ts
│               ├── 📄 marketplace.test.ts
│               └── 📄 workspace.test.ts
│
├── 📄 package.json                             <-- Root project configuration
├── 📄 HOW_TO_RUN_TESTS.md                      <-- This guide!
└── 📄 TESTING_GUIDE.md                         <-- Technical testing reference
```

---

## 6. Step 5: How to Run the Test Scripts (The Commands)

Make sure your terminal is at the **root directory** of the project (`ResearchOS`).

### 5.1 Run All Frontend UI Tests (Recommended)
This runs all 94 frontend user interface test cases across all modules:
```bash
pnpm --filter @researchos/web test -- --run
```

---

### 5.2 Run a Single Specific Test File
If you want to run only one specific test file (for example, only the Admin Console or only the Landing Page), copy and paste any of these commands:

#### 🟢 Frontend Specific Test Commands:
```bash
# 1. Admin Command Center & Governance UI Tests
pnpm --filter @researchos/web exec tsx --test src/tests/admin-console-ui.test.tsx

# 2. Authentication, User Registration & Role Guard Tests
pnpm --filter @researchos/web exec tsx --test src/tests/auth-rbac-ui.test.tsx

# 3. Community Forum & Discussion Posts UI Tests
pnpm --filter @researchos/web exec tsx --test src/tests/community-ui.test.tsx

# 4. Experiment Tracker, Visualizer & Code Playground UI Tests
pnpm --filter @researchos/web exec tsx --test src/tests/experiment-tracker-ui.test.tsx

# 5. Landing Page, Workbench Simulator & Showcase UI Tests
pnpm --filter @researchos/web exec tsx --test src/tests/landing-page.test.tsx

# 6. Literature Review, PDF Reader & Smart Sidebar UI Tests
pnpm --filter @researchos/web exec tsx --test src/tests/literature-ui.test.tsx

# 7. Manuscript Writing, LaTeX Preview & Peer Review UI Tests
pnpm --filter @researchos/web exec tsx --test src/tests/manuscript-ui.test.tsx

# 8. Workspace Layout, Milestones Journey & Kanban Board UI Tests
pnpm --filter @researchos/web exec tsx --test src/tests/workspace-layout.test.tsx
```

---

### 5.3 Run All Backend API Tests
This executes the backend test suite for databases, authentication tokens, and API endpoints:
```bash
pnpm --filter @researchos/api test
```

#### 🔵 Backend Specific Test Commands:
```bash
# Admin Console backend endpoints & security
pnpm --filter @researchos/api test:admin

# AI Assistant & Quotas backend
pnpm --filter @researchos/api test:ai

# Marketplace & Escrow backend
pnpm --filter @researchos/api test:marketplace

# AI Literature Discovery (ArXiv / PubMed) backend
pnpm --filter @researchos/api test:discovery
```

---

### 5.4 Run the Entire Test Suite
To run all tests across both Frontend and Backend:
```bash
pnpm test
```

To run a TypeScript typecheck across all files:
```bash
pnpm typecheck
```

---

## 7. Step 6: Complete List of Test Files & What Each Does

### 🖥️ Frontend Test Files (`apps/web/src/tests/`)

| # | Test File Name | What Features It Tests |
| :-: | :--- | :--- |
| **1** | `admin-console-ui.test.tsx` | Verifies the Admin Command Center navigation bar, all 7 tabs, metric overview cards, user directory modals, supervisor verification queue, and platform AI engine configuration. |
| **2** | `auth-rbac-ui.test.tsx` | Tests login dialog, Researcher vs Supervisor role selection, registration forms, profile editing, and protected route access barriers. |
| **3** | `community-ui.test.tsx` | Tests community forum feed, post creation modal, screenshot attachments, voting buttons, comment threads, and report disputation modals. |
| **4** | `experiment-tracker-ui.test.tsx` | Tests experiment cards, locked benchmark states, supervisor review flag banners, multi-run comparison matrix, Python WASM code editor, file tree explorer, and dataset uploader. |
| **5** | `landing-page.test.tsx` | Tests the public landing page hero section, DOI search pill, 3-column interactive Live Research Workbench simulator, bento cards, pricing toggles, and blog modal reader. |
| **6** | `literature-ui.test.tsx` | Tests research paper cards, PDF reader layout, collection sidebar, reading status pills, annotation highlighters, sticky notes, and AI Structured Synthesis sidebar. |
| **7** | `manuscript-ui.test.tsx` | Tests manuscript editor, IMRAD structure wizard, citation search modal, peer review comment drawer, LaTeX preview compiler, figure insertion cards, and version snapshots. |
| **8** | `workspace-layout.test.tsx` | Tests collapsible sidebar navigation, top header project badges, Kanban task board, Research Journey milestone roadmap, workspace calendar, and notification center. |

---

## 8. Step 7: Understanding the Output (Pass vs Fail)

### ✅ What a Successful Test Output Looks Like:
```text
▶ Spec 09 — Frontend Admin Console & Governance Command Center UI Suite
  ✔ 1. AdminConsolePage renders header, admin badge, and all 7 command center tabs (24.5ms)
  ✔ 2. AdminOverviewTab renders high-impact KPI cards and moderation queues (11.2ms)
  ✔ 3. AdminUserDirectoryTab renders user table, filters, and action triggers (15.4ms)
  ✔ 4. UserDetailModal renders user profile, role badge, and metadata (7.8ms)
  ✔ 5. AdminVerificationsTab renders pending requests and approval/rejection actions (9.1ms)
  ✔ 6. UserActionModal renders role dropdown and action confirmation buttons (6.3ms)
✔ Spec 09 — Frontend Admin Console & Governance Command Center UI Suite (74.3ms)

ℹ tests 94
ℹ suites 8
ℹ pass 94
ℹ fail 0
ℹ duration_ms 5022.07
```

- **`✔` (Green Checkmark)**: That specific test passed completely.
- **`pass 94`**: All 94 test cases were verified and succeeded.
- **`fail 0`**: There are zero bugs or breaking changes in the tested components.

---

### ❌ What a Failed Test Looks Like:
```text
✖ 1. AdminConsolePage renders header, admin badge, and all 7 command center tabs
  AssertionError [ERR_ASSERTION]: Must render Tab 7: AI Platform Config
      at c:/Users/.../apps/web/src/tests/admin-console-ui.test.tsx:35:12
```
- If a test fails, the terminal will print `AssertionError`, showing the exact file name and line number where the expectation was not met.

---

## 9. Step 8: Troubleshooting & Common Beginner Errors

### Error 1: `'pnpm' is not recognized as an internal or external command`
- **Fix**: Run `npm install -g pnpm` in your terminal. If it still says not recognized, restart your VS Code or terminal window.

### Error 2: `File ... cannot be loaded because running scripts is disabled on this system`
- **Fix**: Open PowerShell as normal user and run:
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
  ```
  Type `Y` and press Enter.

### Error 3: `Cannot find module '@researchos/shared-types'`
- **Fix**: From the root directory (`ResearchOS`), run:
  ```bash
  pnpm install
  ```

### Error 4: Tests Hang or Do Not Exit
- **Fix**: Make sure you add `-- --run` at the end of the frontend command so it doesn't stay in watch mode:
  ```bash
  pnpm --filter @researchos/web test -- --run
  ```

---

## 🎯 Summary of the Main Command to Remember

Whenever you want to test the entire frontend application, simply open your terminal in the `ResearchOS` folder and run:

```bash
pnpm --filter @researchos/web test -- --run
```

**Happy testing! 🚀**
