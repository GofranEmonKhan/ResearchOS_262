# ResearchOS — Implementation Plan: Coding Experiment Playground

> **Document type:** Standalone implementation plan — do NOT embed into any existing spec or docs file.
> **Status:** ✅ Implemented & Verified (All Steps 1–6 complete, tests passing).
> **Depends on:** `docs/specs/04-experiment-tracker.md`, `docs/data-model.md §4`, `docs/feature-plan.md §4`, Spec 01–02 RBAC contracts.
> **Cross-checked against:** All Spec 00–07 files and current backend (`apps/api/`) + frontend (`apps/web/`) implementations.

---

## 1. Feature Summary

The **Coding Experiment Playground** is a new tab added inside the existing
ExperimentTrackerPage. It gives Researchers an embedded, in-browser Python
code editor where they can:

1. **Write** Python code in a Monaco (VS Code-grade) editor.
2. **Run** the code instantly inside the browser using Pyodide (Python compiled
   to WebAssembly) — no new backend infrastructure required.
3. **Capture** stdout, stderr, execution time, and auto-extracted metrics from
   the last JSON print in a persistent run-history panel.
4. **Save** any run as a formal Experiment record in one click via a
   pre-filled SaveRunAsExperimentModal, which calls the **existing**
   POST /projects/:projectId/experiments API endpoint.
5. **Compare** the saved experiments using the **existing**
   ExperimentComparisonModal and ExperimentGraphicalVisualizer — no changes
   to the comparison infrastructure.

> **Phase scope (this document):** Phase 1 — frontend only. No new backend
> routes, no new database tables, no new Supabase migrations.

---

## 2. Contradiction Analysis vs. Existing Specifications

### 2.1 Role permissions — no conflict

| Spec constraint | How this feature respects it |
|---|---|
| feature-plan.md 4: "Create / run experiment = Researcher only" | Playground Run button is rendered only for Researcher role |
| feature-plan.md 4: "Supervisor = read-only + compare + comment" | Supervisor sees the tab but Run and Save are hidden |
| feature-plan.md 4: "Admin = no visibility of parameters or results" | Admin hits the existing AC-18 gate and never reaches the playground tab |
| data-model.md 4 Experiment.ownerId is server-derived | SaveRunAsExperimentModal never sends ownerId; Express derives from JWT |
| Spec 01 RBAC ownership beats role | POST /projects/:projectId/experiments already enforces project-member check |

### 2.2 Data model — no conflict, no new tables

The playground saves runs as **standard Experiment rows** using the existing schema:

config JSON for a playground-sourced experiment:
`json
{
  "source": "playground",
  "language": "python",
  "codeSnippet": "# user code",
  "environment": "Browser / Pyodide 0.26.x",
  "pyodideVersion": "0.26.x",
  "model": "",
  "dataset": "",
  "hardware": "Browser WASM",
  "codeCommit": "",
  "environmentNotes": ""
}
`

This is valid per Spec 04 which says config supports "at minimum" those fields;
adding extra keys (source, language, codeSnippet, pyodideVersion) is allowed.

### 2.3 API endpoints — no new routes needed

| Existing endpoint | Usage |
|---|---|
| POST /projects/:projectId/experiments | Save a run as an experiment |
| GET /projects/:projectId/experiments | Refresh list after save |
| GET /experiments/compare?ids= | Compare saved runs |

### 2.4 FileAsset — no conflict

outputFileIds will be empty array for playground-created experiments in MVP.
No Supabase Storage interaction needed.

### 2.5 Manuscript integration — consistent

ExperimentGraphicalVisualizer already supports "Save to Paper Figures" and
InsertFigureModal already has "Saved Experiment Figures" tab (Spec 04 and 05
linkage). A playground-saved experiment participates without any changes because
it is stored as a standard Experiment row.

---

## 3. Architecture Overview

`
ExperimentTrackerPage.tsx
├── Tab 0: "Experiment Runs"   [existing grid]
└── Tab 1: "Code Playground"   [NEW]
      └── CodePlayground.tsx
            ├── Left: Monaco Editor (language selector, toolbar)
            ├── Right: CodePlaygroundOutputPanel.tsx
            │         stdout / stderr / metrics table / run history
            └── Bottom Bar: [Run] [Save as Experiment] [Clear]
`

---

## 4. Execution Engine — Pyodide (Python WASM)

- Loaded lazily from CDN on first Run click (not in app bundle).
- CDN URL: https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js
- Wrapped in singleton promise — multiple clicks do not create multiple instances.
- stdout/stderr captured via custom stream redirection.
- Metric extraction: if last non-empty stdout line is valid JSON with all-numeric
  values, those key-value pairs become the experiment metrics.
- Python exceptions shown in red stderr panel; browser tab never crashes.
- Timeout: 30-second Web Worker timeout kills infinite loops gracefully.

---

## 5. Frontend Components

### 5.1 CodePlayground.tsx
Location: apps/web/src/components/experiments/CodePlayground.tsx

Props:
  projects: Project[]
  activeProjectId: string
  currentUserRole: UserRole
  onExperimentSaved: () => void  — triggers refetch in parent

Internal RunRecord type:
  id: string (UUID)
  timestamp: string (ISO)
  code: string
  language: 'python'
  stdout: string
  stderr: string
  exitCode: number (0 = success)
  metrics: Record<string, number>
  durationMs: number

### 5.2 CodePlaygroundOutputPanel.tsx
Location: apps/web/src/components/experiments/CodePlaygroundOutputPanel.tsx

Props:
  runHistory: RunRecord[]
  activeRunId: string | null
  onSelectRun: (id: string) => void
  onSaveRun: (run: RunRecord) => void
  isRunning: boolean

### 5.3 SaveRunAsExperimentModal.tsx
Location: apps/web/src/components/experiments/SaveRunAsExperimentModal.tsx

Props:
  isOpen: boolean
  onClose: () => void
  run: RunRecord
  projects: Project[]
  activeProjectId: string
  onSaved: (experiment: Experiment) => void

Pre-filled fields from RunRecord:
  name = "Python Run — " + today's date (editable)
  purpose = ModelTesting (editable dropdown)
  date = today (editable)
  hypothesis = "" (editable)
  config.codeSnippet = run.code (read-only preview)
  config.language = "python" (read-only)
  config.environment = "Browser / Pyodide" (editable)
  config.model = "" (editable)
  config.dataset = "" (editable)
  config.hardware = "Browser WASM" (editable)
  metrics = run.metrics (editable rows)
  observation = run.stdout.slice(0, 500) (editable)

---

## 6. Changes to ExperimentTrackerPage.tsx

### New state
  const [activeTab, setActiveTab] = useState<'runs' | 'playground'>('runs');

### New import
  import { Code2 } from 'lucide-react';

### Tab bar
  Rendered below the header bar, above the stats strip.
  Tabs: "Experiment Runs" (Layers icon) | "Code Playground" (Code2 icon)

### Conditional render
  activeTab === 'runs'  → existing stats strip + filter toolbar + experiment grid
  activeTab === 'playground' → <CodePlayground> component

### Admin gate
  Existing AC-18 early return happens before tab bar renders.
  Admin never sees the playground tab.

### Supervisor constraint
  When profile.role === 'Supervisor', CodePlayground receives readOnly={true}
  which hides Run and Save buttons. Supervisor can view the editor/output
  but cannot execute code or create experiment records.

---

## 7. New npm Dependency

Package: @monaco-editor/react
Version: ^4.6.0
Workspace: apps/web
Reason: VS Code-grade syntax highlighting and keyboard shortcuts in-browser.
Alternatives considered: CodeMirror 6 (heavier API), ace-editor (dated),
  plain textarea (poor UX).

Pyodide: loaded from CDN at runtime — NO npm package added.
This avoids adding ~10 MB to the app bundle.

Installation command:
  cd apps/web
  pnpm add @monaco-editor/react@^4.6.0

---

## 8. Files to Create / Modify

### New files (create)
  apps/web/src/components/experiments/CodePlayground.tsx
  apps/web/src/components/experiments/CodePlaygroundOutputPanel.tsx
  apps/web/src/components/experiments/SaveRunAsExperimentModal.tsx

### Modified files
  apps/web/src/pages/dashboards/ExperimentTrackerPage.tsx
    — add activeTab state, tab bar, conditional render, Code2 import
  apps/web/package.json
    — add @monaco-editor/react

### NOT changed (no modifications)
  apps/api/src/routes/experiment.routes.ts
  apps/api/src/services/experiment.service.ts
  supabase/migrations/
  packages/shared-types/src/index.ts  (RunRecord is local UI state only)
  docs/data-model.md
  docs/specs/04-experiment-tracker.md
  Any other module spec file

---

## 9. Data Flow

1. User opens Code Playground tab
2. CodePlayground mounts → if first run: loadPyodide() from CDN (lazy)
3. User edits code in Monaco Editor
4. User clicks Run
   → handleRun():
     startTime = performance.now()
     pyodide.runPythonAsync(code) with stdout/stderr capture
     durationMs = performance.now() - startTime
     metrics = extractMetrics(stdout last line)
     RunRecord created → appended to runHistory[]
5. Output panel updates (stdout, stderr, metrics, run history entry)
6. User clicks Save as Experiment
   → SaveRunAsExperimentModal opens with pre-filled fields
7. User reviews/edits name, purpose, hypothesis → submits
   → api.createExperiment(projectId, CreateExperimentDto)
   → POST /projects/:projectId/experiments
   → Express: auth + role + project-member check
   → ExperimentService.createExperiment() → Supabase INSERT
   → returns Experiment
8. onExperimentSaved() callback fires
   → ExperimentTrackerPage.fetchExperiments() called
   → New card appears in Experiment Runs tab
9. User selects 2–5 experiments → clicks Compare
   → ExperimentComparisonModal → ExperimentGraphicalVisualizer
   [existing flow — unchanged]

---

## 10. Implementation Steps (All Completed ✅)

- [x] **Step 1: Install dependency**
  - Ran `pnpm --filter web add @monaco-editor/react@^4.6.0` (installed version `^4.7.0`).
  - Lockfile updated cleanly.

- [x] **Step 2: Create CodePlayground.tsx**
  - In-browser Pyodide WASM singleton loader with CDN fallback.
  - Custom stream interception for stdout and stderr.
  - Automatic JSON metric extraction utility.
  - Monaco Editor integration with dark theme (`vs-dark`), Fira Code typography, syntax highlighting.
  - Preset template switcher (Model Evaluation, Hyperparameter Tuning, Hypothesis Testing).
  - Execution timeout protection (30-second guard).

- [x] **Step 3: Create CodePlaygroundOutputPanel.tsx**
  - Multi-tab output console (Console, Metrics, History).
  - Monospace STDOUT / STDERR display with syntax color differentiation.
  - Auto-extracted metrics cards.
  - Session run history drawer with timestamp and duration metrics.

- [x] **Step 4: Create SaveRunAsExperimentModal.tsx**
  - Pre-fills experiment run name, purpose, date, code snippet, duration, and extracted metrics.
  - Captures reproducibility metadata (`source: 'playground'`, `language: 'python'`).
  - Allows editing hyperparameters, metrics, and observations before saving to database.
  - Calls `api.createExperiment(projectId, dto)`.

- [x] **Step 5: Modify ExperimentTrackerPage.tsx**
  - Added `activeTab` state (`'runs' | 'playground'`).
  - Integrated navigation tab bar (`Experiment Runs` & `Code Playground` with `Python WASM` badge).
  - Enforced RBAC (Admin AC-18 privacy gate intact; Supervisor gets `readOnly={true}`).
  - Wired `onExperimentSaved` to refresh project experiment list.

- [x] **Step 6: Verify (manual & automated verification)**
  - `pnpm --filter web build` builds with 0 errors.
  - `pnpm --filter web typecheck` passes with 0 errors.
  - Unit & component tests in `apps/web/src/tests/experiment-tracker-ui.test.tsx` pass (81/81 web tests pass).

---

## 11. Acceptance Criteria Status

  [x] "Code Playground" tab appears for Researcher and Supervisor roles
  [x] Admin is blocked by AC-18 gate and never sees the tab
  [x] Python code editor has syntax highlighting (Monaco language="python")
  [x] Run executes code in-browser and shows output within 10 seconds
  [x] Pyodide loads only on first Run click, not on page load
  [x] Last-line JSON with all-numeric values auto-extracted as metrics
  [x] Python exceptions shown in stderr; browser tab does not crash
  [x] Run history lists all session runs newest-first; clicking restores output
  [x] Run and Save buttons are NOT rendered for Supervisor role
  [x] Save as Experiment modal opens pre-filled from RunRecord
  [x] Submitting modal calls POST /projects/:projectId/experiments (verified Network tab)
  [x] New experiment appears in Experiment Runs tab within 2 seconds of save
  [x] Saved experiment participates in 2–5 run compare flow
  [x] config JSON includes source="playground", codeSnippet, language
  [x] outputFileIds is empty array (no Storage interaction)
  [x] Supervisor can flag playground-created experiment via existing flag modal
  [x] All existing Spec 04 acceptance criteria remain satisfied (no regression)

---

## 12. Out of Scope (Future Phases)

  - Server-side Python execution (GPU / package access beyond Pyodide)
  - R and SQL language execution
  - File upload as dataset input
  - Persistent versioned code notebooks
  - Code-to-Git-commit linkage (auto codeCommit)
  - Pyodide package installer UI
  - Real-time co-editing of playground code

---

## 13. Risk Register

  Risk: Pyodide CDN unavailable
  Mitigation: Degrade gracefully; allow manual metric entry

  Risk: Pyodide takes >10s on slow connection
  Mitigation: Progress bar during load; disable Run button with loading text

  Risk: Infinite loop (while True)
  Mitigation: 30-second timeout; terminate Pyodide worker if exceeded

  Risk: Large stdout floods DOM
  Mitigation: Cap display at 10,000 characters; append truncation notice

  Risk: Monaco bundle size
  Mitigation: @monaco-editor/react lazy-loads; minimal initial bundle impact

---

## 14. Documents Read for This Plan

  docs/data-model.md §4 — Experiment schema confirmed
  docs/feature-plan.md §4 — Role rules confirmed
  docs/specs/04-experiment-tracker.md — Full spec reviewed
  docs/specs/01-auth-rbac.md — RBAC middleware pattern confirmed
  docs/specs/02-research-workspace.md — Project access scope confirmed
  apps/api/src/routes/experiment.routes.ts — Backend contract reviewed
  apps/api/src/services/experiment.service.ts — Service logic reviewed
  apps/web/src/lib/api.ts — api.createExperiment confirmed present
  apps/web/src/pages/dashboards/ExperimentTrackerPage.tsx — Integration points mapped
  apps/web/src/components/experiments/ExperimentGraphicalVisualizer.tsx — No changes needed
  supabase/migrations/ listing — No new migration needed
