# 🛡️ ResearchOS — Project Switching & Comeback Guide

> **Purpose:** Prevent the "unusual characters in code files" issue that happens when you close this project, work on another project for days/weeks, and come back.

---

## 🔍 What Caused the Problem (Root Cause Analysis)

The "unusual characters instead of code" issue you experienced has **three probable causes**, and they often combine:

### Cause 1: Line Ending Corruption (CRLF ↔ LF Mismatch) — **MOST LIKELY**

| What happens | Why |
|-------------|-----|
| Windows uses `CRLF` (`\r\n`) for line endings. Linux/Mac uses `LF` (`\n`). | Git tries to convert between them automatically. |
| Without a `.gitattributes` file, Git guesses which files are text vs binary. | Sometimes it guesses **wrong** — treating source code as binary, or vice versa. |
| When you reopen the project, Git or your editor re-normalizes the files. | Mixed line endings make the file look like it has `^M` or garbled characters. |

**✅ FIXED NOW:** I've created a [`.gitattributes`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/.gitattributes) file that explicitly tells Git how to handle every file type.

### Cause 2: `node_modules` / Lock File Corruption

| What happens | Why |
|-------------|-----|
| You close the project with `node_modules` intact. | Over 10-12 days, Windows updates, disk cleanup, or antivirus may corrupt files inside `node_modules`. |
| `pnpm-lock.yaml` references specific package versions. | If `node_modules` is partially deleted or corrupted, imports break with garbled content. |
| Your editor tries to open a binary file from `node_modules` as text. | You see "unusual characters" — it's actually binary `.node` or compiled files. |

### Cause 3: Editor Cache / TypeScript Compile Cache Stale

| What happens | Why |
|-------------|-----|
| VS Code / Antigravity IDE caches file contents in memory. | If you reopen the project after days, stale cache may show old/mixed content. |
| TypeScript's `dist/` folder contains compiled JS from old source. | Running old compiled output against new source creates confusion. |
| `.tsbuildinfo` cache files become inconsistent. | TypeScript incremental builds use stale checksums. |

---

## ✅ What I've Already Done (Permanent Fixes)

| Fix | File | Purpose |
|-----|------|---------|
| ✅ Created `.gitattributes` | [`.gitattributes`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/.gitattributes) | Forces Git to treat all `.ts`, `.tsx`, `.js`, `.json`, `.css`, `.md`, `.sql` as text with LF endings. Marks images/fonts/PDFs as binary. |
| ✅ Created `.editorconfig` | [`.editorconfig`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/.editorconfig) | Forces all editors (VS Code, Antigravity, etc.) to use UTF-8 encoding and LF line endings. |
| ✅ Committed & pushed | Branch: `feature/research-journey-milestones-roadmap` | These protective files are now permanently in your repository. |
| ✅ Normalized line endings | All tracked files | Ran `git rm --cached -r . && git reset --hard` to re-normalize all existing files against the new `.gitattributes`. |

---

## 📋 BEFORE You Switch Projects — Checklist

Run these steps **right now**, before opening your other project:

### Step 1: Make sure everything is committed and pushed

```powershell
# Open PowerShell/Terminal in the ResearchOS folder

# Check for any uncommitted changes
cd "c:\Users\Abdul Gofran Emon\ResearchOS"
git status

# If there are changes, commit them:
git add -A
git commit -m "chore: save work before switching projects"
git push origin feature/research-journey-milestones-roadmap
```

### Step 2: Verify your branch name

```powershell
# Write down which branch you're on!
git branch --show-current
```

> **📝 Your current branch is: `feature/research-journey-milestones-roadmap`**

### Step 3: Stop all running dev servers

```powershell
# Make sure NO dev servers are running
# Press Ctrl+C in any terminal running:
#   - pnpm dev (frontend)
#   - pnpm dev (backend/API)
#   - Any other running process
```

### Step 4: (Optional but recommended) Clean build artifacts

```powershell
# Remove compiled output to prevent stale cache issues
Remove-Item -Recurse -Force "apps\api\dist" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "apps\web\dist" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "apps\web\.vite" -ErrorAction SilentlyContinue
```

### Step 5: Close the project in your editor

Close ALL files and the workspace in VS Code / Antigravity IDE.

> ⚠️ **DO NOT** delete `node_modules` before leaving — it saves 3-5 minutes on reinstall when you come back, and pnpm handles consistency well.

---

## 📋 WHEN You Come Back — Checklist

Follow these steps **in exact order** when you reopen ResearchOS after 10+ days:

### Step 1: Open terminal FIRST (before opening files in editor)

```powershell
cd "c:\Users\Abdul Gofran Emon\ResearchOS"
```

### Step 2: Verify you're on the right branch

```powershell
git branch --show-current
# Expected: feature/research-journey-milestones-roadmap

# If you're on a different branch:
git checkout feature/research-journey-milestones-roadmap
```

### Step 3: Pull latest changes from GitHub

```powershell
git pull origin feature/research-journey-milestones-roadmap
```

### Step 4: Check for encoding issues BEFORE opening editor

```powershell
# Quick health check — this should show NO output if files are clean
git diff --check
```

If `git diff --check` shows warnings about whitespace/line endings:

```powershell
# Re-normalize all files (safe — won't lose any code)
git rm --cached -r .
git reset --hard HEAD
```

### Step 5: Reinstall dependencies (CRITICAL!)

```powershell
# This is the MOST IMPORTANT step!
# Even if node_modules exists, run this to ensure consistency

pnpm install
```

If `pnpm install` fails or gives errors:

```powershell
# Nuclear option — completely clean reinstall
Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "apps\web\node_modules" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "apps\api\node_modules" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "packages\shared-types\node_modules" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "packages\config\node_modules" -ErrorAction SilentlyContinue

pnpm install
```

### Step 6: Clean and rebuild

```powershell
# Remove stale compiled output
Remove-Item -Recurse -Force "apps\api\dist" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "apps\web\dist" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "apps\web\.vite" -ErrorAction SilentlyContinue

# Rebuild TypeScript to catch any issues early
cd apps\api
pnpm run build
cd ..\..

# Type-check the frontend
cd apps\web
pnpm run typecheck
cd ..\..
```

### Step 7: NOW open the project in your editor

Open the `ResearchOS` folder in VS Code or Antigravity IDE.

### Step 8: Start the dev servers

```powershell
# Terminal 1 — Backend API
cd apps\api
pnpm dev

# Terminal 2 — Frontend
cd apps\web
pnpm dev
```

### Step 9: Verify everything works

Open `http://localhost:5173` in your browser and:
- [ ] Login works
- [ ] Dashboard loads
- [ ] No console errors in browser DevTools (F12)

---

## 🚨 Emergency: If You STILL See Unusual Characters

If after following the comeback checklist you still see garbled files:

### Option A: Restore a single file from Git

```powershell
# Replace <file-path> with the corrupted file's path
git checkout HEAD -- <file-path>

# Example:
git checkout HEAD -- apps/web/src/App.tsx
```

### Option B: Hard reset the entire working tree

```powershell
# ⚠️ This discards ALL local changes — make sure you've committed first!
git reset --hard HEAD
```

### Option C: Fresh clone (last resort)

```powershell
# Go to parent directory
cd "c:\Users\Abdul Gofran Emon"

# Rename the old folder (don't delete it yet)
Rename-Item "ResearchOS" "ResearchOS_backup"

# Fresh clone
git clone https://github.com/GofranEmonKhan/ResearchOS_262.git ResearchOS
cd ResearchOS

# Switch to your working branch
git checkout feature/research-journey-milestones-roadmap

# Install dependencies
pnpm install

# Copy your .env files from the backup (they're not in git)
Copy-Item "..\ResearchOS_backup\apps\api\.env" "apps\api\.env"
Copy-Item "..\ResearchOS_backup\.env" ".env" -ErrorAction SilentlyContinue
```

---

## 📌 Quick Reference Card

### Before Leaving
```
1. git add -A && git commit -m "save work" && git push
2. Stop all dev servers (Ctrl+C)
3. (Optional) Delete dist/ folders
4. Close editor
```

### When Coming Back
```
1. cd ResearchOS
2. git branch --show-current  (verify branch)
3. git pull origin feature/research-journey-milestones-roadmap
4. git diff --check  (verify no encoding issues)
5. pnpm install  (reinstall/sync dependencies)
6. Delete dist/ folders
7. pnpm run build (in apps/api)
8. Open editor
9. pnpm dev (start servers)
```

---

## 🔧 Environment Info (For Reference)

| Tool | Version (as of Oct 2026) |
|------|--------------------------|
| Node.js | v24.19.0 |
| pnpm | 11.21.0 |
| Git | 2.55.0.windows.4 |
| Branch | `feature/research-journey-milestones-roadmap` |
| Remote | `https://github.com/GofranEmonKhan/ResearchOS_262.git` |

---

> **💡 TIP:** If a classmate also works on this repo while you're away, always `git pull` before doing anything. Merge conflicts are much easier to handle on clean files than on corrupted ones.

---

## ✅ Automated Pre-Departure Actions Completed (Ready to Switch)

Before switching to your new project, all protective maintenance and safety checks were executed:

1. **Configured Line Endings & Encoding Protection**:
   - Created [`.gitattributes`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/.gitattributes) to enforce `eol=lf` and explicit binary handling across all source and asset files.
   - Created [`.editorconfig`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/.editorconfig) to enforce UTF-8 charset and LF line endings across VS Code and other editors.
   - Normalized Git index line endings to match the new `.gitattributes` rules.
2. **Cleaned Build Artifacts**:
   - Removed compiled `apps/api/dist` and `apps/web/dist` folders to eliminate stale or locked cache files.
3. **Checked Background Services**:
   - Verified that no background development servers (`pnpm dev`, nodemon, Vite) are running.
4. **Verified Git & Remote Status**:
   - Verified a 100% clean working tree (`git status` reports clean).
   - Ensured all commits are pushed to remote branch `feature/research-journey-milestones-roadmap` on GitHub (`https://github.com/GofranEmonKhan/ResearchOS_262.git`).

> **Status:** **SAFE TO CLOSE AND SWITCH.** You can now safely close this workspace and open your other project.

