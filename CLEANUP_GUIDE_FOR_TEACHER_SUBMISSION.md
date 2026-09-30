# Project Cleanup Guide for Teacher Submission & Review

> **Note**: This guide lists files and directories that were used exclusively for **AI agentic development (Antigravity / Claude Code)** and internal tracking. 
> 
> **Deleting the files in Section 1 and Section 2 from a copied version of this project will NOT affect the live execution or compilation of the application in any way.**

---

## 🗑️ 1. Safe to Delete (AI Agent & Tooling Files)
These files and folders were used exclusively by the AI coding assistant (Antigravity / Claude Code) for skill discovery, agent rules, and internal task planning. None of them are imported or used in the application code.

| File / Folder Path | Type | What it is | Why it's safe to delete |
| :--- | :--- | :--- | :--- |
| **`.agents/`** | Folder | Antigravity AI Skills & Plugins | Contains prompt skills (e.g., `ui-styling`, `brand`, `agent-development`). Not referenced by any code. |
| **`.antigravity/`** | Folder | Antigravity Agent Cache | Internal cache and telemetry directory for the AI IDE. |
| **`skills-lock.json`** | File | Agent Skills Lockfile | Tracks versions of installed agent skills. Not used by Node.js/pnpm. |
| **`AGENTS.md`** | File | AI Agent Rulebook | Prompt guidelines and architectural constraints for AI agents. |
| **`WORKLOG.md`** | File | AI Development Worklog | Step-by-step dev log tracking implementation phases. |

---

## 📄 2. Optional to Delete (Internal Docs & Design Notes)
These files are markdown documentation and design reference sheets. You can keep them if you want to show your teacher your software documentation and design planning, or delete them to keep the project strictly code-focused.

| File / Folder Path | Type | Description |
| :--- | :--- | :--- |
| **`design-system/`** | Folder | Markdown design system guidelines (color tokens, font specs). The actual styles are implemented in `apps/web/src/index.css` and `tailwind.config.js`. |
| **`docs/plans/`** | Folder | Internal sprint & feature implementation planning notes. |
| **`ResearchOS_GitHub_Team_Workflow.docx`** | File | Internal Word document regarding team Git workflow. |
| **`.github/`** | Folder | GitHub Actions CI/CD workflows (`ci.yml`). Safe to delete if not demonstrating automated CI. |

---

## ⛔ 3. DO NOT DELETE (Critical Files Required to Run the App)
These files form the core application, build pipeline, and database schema. **The project will fail to build or run if any of these are removed:**

### A. Application Code (`apps/`)
* **`apps/web/`**: Complete React 18 + Vite + Tailwind CSS frontend application.
  * *Must keep:* `src/`, `package.json`, `vite.config.ts`, `tailwind.config.js`, `tsconfig.json`, `index.html`, and `apps/web/.env`.
* **`apps/api/`**: Complete Node.js + Express + TypeScript backend API.
  * *Must keep:* `src/`, `package.json`, `tsconfig.json`, and `apps/api/.env`.

### B. Shared Workspace Packages (`packages/`)
* **`packages/shared-types/`**: Shared TypeScript interfaces, DTOs, and Enums used by both web and api.
* **`packages/config/`**: Shared tsconfig bases.

### C. Database Schema & Migrations (`supabase/`)
* **`supabase/migrations/`**: All SQL migration files (tables, triggers, `pgvector`, enums, RLS policies).
* **`supabase/config.toml`**: Supabase CLI project settings.
* **`supabase/seed.sql`**: Initial database seed data.

### D. Monorepo Root Configuration Files
* **`package.json`**: Root monorepo build scripts (`dev`, `build`, `test`, `typecheck`).
* **`pnpm-workspace.yaml`**: Links `apps/*` and `packages/*` as a monorepo workspace.
* **`pnpm-lock.yaml`**: Ensures exact dependency versions install consistently.
* **`.npmrc`**: pnpm package resolution settings.
* **`.gitignore`**: Prevents secrets and build files from being committed.

### E. Recommended Academic Presentation Docs (Keep to show teacher)
* **`PROJECT_ARCHITECTURE_EXPLANATION.md`**: In-depth defense guide covering database connection, SQL migrations, authentication, Google OAuth, and RBAC.
* **`docs/data-model.md`**: Complete entity relationship and data schema documentation.
* **`docs/feature-plan.md`**: Functional requirements and feature specifications.

---

## 🧹 4. Folders to Exclude When Making a Zip / Copy
When sending or copying the folder to another computer or teacher, **do not copy these heavy generated folders** (they take up gigabytes and will be regenerated automatically):

1. **`node_modules/`** (Root and subfolders) — Run `pnpm install` on the target machine instead.
2. **`apps/web/dist/`** & **`apps/api/dist/`** — Built automatically with `pnpm build`.
3. **`.git/`** (Optional) — Git history folder; exclude if you only want to send clean source code without commit history.

---

## ⚡ Quick Cleanup Commands (For PowerShell / Windows on Copied Project)

If you made a copy on your Desktop (e.g. `C:\Users\...\Desktop\ResearchOS-Submission`), you can run these commands in PowerShell inside the copied folder to delete all unnecessary AI files at once:

```powershell
# 1. Remove AI agent tooling and skills
Remove-Item -Recurse -Force .agents -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .antigravity -ErrorAction SilentlyContinue
Remove-Item -Force skills-lock.json -ErrorAction SilentlyContinue
Remove-Item -Force AGENTS.md -ErrorAction SilentlyContinue
Remove-Item -Force WORKLOG.md -ErrorAction SilentlyContinue

# 2. (Optional) Remove planning notes and word docs
Remove-Item -Recurse -Force docs\plans -ErrorAction SilentlyContinue
Remove-Item -Force ResearchOS_GitHub_Team_Workflow.docx -ErrorAction SilentlyContinue
```
