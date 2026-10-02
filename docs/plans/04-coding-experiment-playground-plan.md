# ResearchOS — Implementation Plan: Coding Experiment Playground

> **Document type:** Standalone implementation plan — do NOT embed into any existing spec or docs file.
> **Status:** 
> - **Phase 1 (Completed & Verified ✅):** In-browser Monaco Python Editor, Pyodide WASM Runtime, Auto-Metrics Extraction, Save Modal, Tab Integration.
> - **Phase 2 (Planned 🚀):** VS Code–Style Project Folder Tree, Multi-File Python Execution with Pyodide VFS, Dataset Upload & Ingestion (Local + Cloud).
> **Depends on:** `docs/specs/04-experiment-tracker.md`, `docs/data-model.md §4`, `docs/feature-plan.md §4`, Spec 01–02 RBAC contracts.
> **Cross-checked against:** All Spec 00–07 files and current backend (`apps/api/`) + frontend (`apps/web/`) implementations.

---

## 1. Feature Summary & Objectives

The **Coding Experiment Playground** provides an embedded, VS Code–grade Python development and experimental environment directly inside the ResearchOS Experiment Tracker.

### Core Capabilities:
1. **VS Code–Grade Multi-File Workspace:** Project-scoped folder and file hierarchy (`src/`, `models/`, `utils/`, `data/`, `main.py`, `config.json`).
2. **Strict Research Project Isolation:** Every file, folder, and dataset belongs strictly to the selected Research Project (`projectId`). Switching projects instantly switches workspaces with zero cross-project pollution.
3. **Dataset Ingestion (Local + Cloud):**
   - **Local File Uploads:** Drag-and-drop or upload custom datasets (`.csv`, `.json`, `.tsv`, `.txt`, `.npy`, `.parquet`) into the project's `data/` folder.
   - **Cloud Dataset Streaming:** Direct Python fetch from Hugging Face, GitHub Raw, OpenML, and public cloud URLs using Pyodide HTTP streaming (`pyodide.http.open_url`).
4. **Multi-File Python Execution in WASM:** Synchronizes all project files into Pyodide's virtual filesystem (`pyodide.FS`), enabling native cross-file module imports (`from models.classifier import ResNet`, `from utils.metrics import compute_f1`).
5. **Automated Metrics Extraction & Experiment Tracking:** Auto-extracts JSON numeric dictionaries printed on standard output and saves full multi-file experiment snapshots into the ResearchOS experiment tracker.
6. **Comparison & Manuscript Figure Integration:** Saved experiments seamlessly participate in the 2–5 run comparison matrix and LaTeX figure generation flows without backend schema modifications.

---

## 2. Contradiction Analysis vs. Existing Specifications

### 2.1 Role Permissions & RBAC
| Role | Playground Permissions | Specification Guarantee |
|---|---|---|
| **Researcher** | Create/Edit/Delete files & folders, Upload datasets, Execute code, Save experiment runs. | `feature-plan.md §4`: "Create / run experiment = Researcher only". |
| **Supervisor** | Read-only inspection of file tree and code scripts; can inspect outputs & compare runs; Run and Save actions disabled. | `feature-plan.md §4`: "Supervisor = read-only + compare + comment". |
| **Admin** | Restricted by AC-18 institutional privacy gate before reaching experiment data. | `specs/04-experiment-tracker.md`: AC-18 institutional privacy barrier. |

### 2.2 Data Model & Multi-File Storage
Saved experiments store their reproducibility context in the existing `config` JSON field without requiring schema migrations:
```json
{
  "source": "playground",
  "language": "python",
  "entrypoint": "main.py",
  "codeSnippet": "# Content of main.py",
  "environment": "Browser / Pyodide 0.26.4",
  "hardware": "Browser WASM Sandbox",
  "files": [
    { "path": "main.py", "content": "..." },
    { "path": "models/classifier.py", "content": "..." },
    { "path": "utils/metrics.py", "content": "..." },
    { "path": "data/dataset_sample.json", "content": "..." }
  ],
  "dataset": "data/iris.csv (Uploaded) / In-Memory",
  "environmentNotes": "Executed in Pyodide WASM sandbox with 4 project files"
}
```

---

## 3. Architecture Overview & Layout

```
ExperimentTrackerPage.tsx
├── Top Bar: Project Selector [ "Multimodal LLMs" ▼ ] | Tab Switcher: [ 📊 Experiment Runs ] [ 🐍 Code Playground (Python WASM) ]
└── CodePlayground.tsx (VS Code Workspace Layout)
      ├── 📁 Left Panel: FileTreeExplorer (220px collapsible)
      │     ├── Workspace Header: "PROJECT WORKSPACE" (+ New File, + New Folder, ⬆ Upload Dataset)
      │     └── Tree View:
      │           ├── 📁 models/
      │           │     └── 📄 classifier.py
      │           ├── 📁 utils/
      │           │     └── 📄 metrics.py
      │           ├── 📁 data/
      │           │     └── 📊 benchmark.csv (Uploaded dataset)
      │           ├── 📄 config.json
      │           └── 🚀 main.py [Entrypoint badge]
      │
      ├── 💻 Center Panel: Monaco Editor & Tab Bar
      │     ├── EditorTabs: [ 🚀 main.py ✕ ] [ 📄 classifier.py ✕ ] [ 📊 benchmark.csv ✕ ]
      │     └── Monaco Editor (syntax highlighting, line numbers, autocomplete, linting)
      │
      └── 🖥️ Right Panel: CodePlaygroundOutputPanel (Console / Metrics / History)
            ├── Console: Real-time STDOUT & STDERR with Traceback rendering
            ├── Metrics: Auto-detected metric cards (accuracy, loss, F1)
            └── Actions: [ ▶ Run Code ] [ 💾 Save Run as Experiment ]
```

---

## 4. Virtual File System & Pyodide Integration

### 4.1 Pyodide Virtual File System (Emscripten VFS) Mounting
Prior to executing Python code, all files in the project workspace are automatically synchronized into Pyodide's in-memory `/workspace` filesystem:

```ts
// Sync project files into Pyodide Emscripten VFS
export function syncWorkspaceToPyodide(pyodide: any, files: ProjectWorkspaceFile[]) {
  // Ensure base workspace directory exists
  if (!pyodide.FS.analyzePath('/workspace').exists) {
    pyodide.FS.mkdir('/workspace');
  }

  // Create subdirectories and write file contents
  for (const file of files) {
    const parts = file.path.split('/');
    let currentPath = '/workspace';
    
    // Create intermediate directories if needed
    for (let i = 0; i < parts.length - 1; i++) {
      currentPath += '/' + parts[i];
      if (!pyodide.FS.analyzePath(currentPath).exists) {
        pyodide.FS.mkdir(currentPath);
      }
    }

    // Write file content
    const fullFilePath = `/workspace/${file.path}`;
    pyodide.FS.writeFile(fullFilePath, file.content, { encoding: 'utf8' });
  }

  // Add /workspace to Python sys.path so modules can import directly
  pyodide.runPython(`
import sys
if '/workspace' not in sys.path:
    sys.path.insert(0, '/workspace')
`);
}
```

### 4.2 Cross-File Python Imports Support
Researchers can structure clean, modular Python projects:
```python
# main.py
from models.classifier import SimpleClassifier
from utils.metrics import calculate_accuracy
import csv
import json

# Read local uploaded dataset
data = []
with open('data/benchmark.csv', mode='r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        data.append(row)

model = SimpleClassifier()
results = model.evaluate(data)
accuracy = calculate_accuracy(results['predictions'], results['ground_truth'])

print("Experiment finished.")
print(json.dumps({"accuracy": round(accuracy, 4), "samples": len(data)}))
```

---

## 5. Dataset Upload & Ingestion Specifications

### 5.1 Local Dataset Upload
* **Target Directory:** Default uploaded files are saved into the `data/` folder.
* **File Types Supported:** `.csv`, `.json`, `.tsv`, `.txt`, `.npy`, `.parquet`.
* **Size Boundary:** Client-side in-memory processing up to 50MB per file with progress bar and instant text/preview visualization.
* **UI Controls:**
  - Drag & drop files directly onto the `data/` folder in the file tree.
  - "Upload Dataset" button in the file explorer toolbar opening a file picker.

### 5.2 Cloud Dataset Fetching
Researchers can stream remote datasets directly inside their Python scripts without local downloads:
```python
from pyodide.http import open_url
import json

# Download public academic dataset at runtime
url = "https://raw.githubusercontent.com/mwaskom/seaborn-data/master/iris.csv"
content = open_url(url).read()

with open('data/iris.csv', 'w') as f:
    f.write(content)

print("Iris dataset fetched from cloud.")
```

---

## 6. TypeScript Contracts & Data Models

### 6.1 Workspace State Contract
```ts
export interface ProjectWorkspaceFile {
  id: string;
  name: string;
  path: string; // e.g. 'src/models/classifier.py' or 'data/iris.csv'
  content: string;
  fileType: 'python' | 'json' | 'csv' | 'markdown' | 'text' | 'generic';
  isEntrypoint?: boolean;
  isReadOnly?: boolean;
  updatedAt: string;
}

export interface ProjectWorkspaceFolder {
  id: string;
  name: string;
  path: string; // e.g. 'models' or 'data'
  isExpanded?: boolean;
}

export interface ProjectWorkspace {
  projectId: string;
  entrypointPath: string; // e.g. 'main.py'
  files: ProjectWorkspaceFile[];
  folders: ProjectWorkspaceFolder[];
  openFilePaths: string[];
  activeFilePath: string;
  lastModified: string;
}
```

### 6.2 Default Workspace Templates per Project
When a user opens the playground for a project for the first time, a starter multi-file project is automatically seeded:
* `main.py` (Entrypoint script with model evaluation and metric emission)
* `models/classifier.py` (Modular Python class definition)
* `utils/metrics.py` (Metric helper functions)
* `data/samples.json` (Structured test dataset)
* `config.json` (Hyperparameters configuration)

---

## 7. Component Architecture & File Layout

### 7.1 New & Updated Components

| Component | Path | Responsibility |
|---|---|---|
| **`CodePlayground.tsx`** | `apps/web/src/components/experiments/CodePlayground.tsx` | Main orchestrator managing project workspace state, Pyodide VFS syncing, execution, and layout. |
| **`FileTreeExplorer.tsx`** | `apps/web/src/components/experiments/FileTreeExplorer.tsx` | VS Code–style file tree sidebar with folder expansion, New File, New Folder, Upload Dataset, rename/delete, and entrypoint selector. |
| **`EditorTabs.tsx`** | `apps/web/src/components/experiments/EditorTabs.tsx` | Multi-file tab bar with close icons, dirty state indicator dots, and active tab highlights. |
| **`DatasetUploadModal.tsx`** | `apps/web/src/components/experiments/DatasetUploadModal.tsx` | Drag & drop modal for uploading local CSV/JSON datasets into the `data/` folder. |
| **`workspaceStorage.ts`** | `apps/web/src/lib/workspaceStorage.ts` | Project-scoped persistence layer using browser `IndexedDB` with fallback to `localStorage`. |
| **`SaveRunAsExperimentModal.tsx`** | `apps/web/src/components/experiments/SaveRunAsExperimentModal.tsx` | Pre-populates multi-file code snapshots and metrics for saving directly to backend API. |

---

## 8. Implementation Roadmap (Phases & Steps)

### Phase 1: Core Single-File WASM Engine (COMPLETED ✅)
- [x] Step 1: Install `@monaco-editor/react@^4.7.0`.
- [x] Step 2: Implement single-script `CodePlayground.tsx` with Pyodide runtime and 30s timeout guard.
- [x] Step 3: Implement `CodePlaygroundOutputPanel.tsx` with Console, Metrics, and Run History.
- [x] Step 4: Implement `SaveRunAsExperimentModal.tsx` pre-filling duration, code, and metrics.
- [x] Step 5: Integrate `ExperimentTrackerPage.tsx` tab navigation and enforce RBAC rules.
- [x] Step 6: Automated verification (TypeScript typecheck, production build, 81 unit tests passing).

### Phase 2: VS Code Project File Tree & Dataset Ingestion (READY FOR EXECUTION 🚀)
- [ ] **Step 2.1: Workspace Storage Layer (`workspaceStorage.ts`)**
  - Implement project-scoped IndexedDB storage keyed by `researchos_workspace_${projectId}`.
  - Implement default workspace template generator for new projects.
- [ ] **Step 2.2: File Tree Explorer Component (`FileTreeExplorer.tsx`)**
  - Collapsible nested folder rendering.
  - Actions: `+ New File`, `+ New Folder`, `⬆ Upload Dataset`, `Rename`, `Delete`.
  - Set Entrypoint file action (marked with 🚀 badge).
- [ ] **Step 2.3: Dataset Upload & Drag-and-Drop (`DatasetUploadModal.tsx`)**
  - Drag-and-drop file parser for `.csv`, `.json`, `.tsv`, `.txt`.
  - Saves uploaded datasets directly into `data/<filename>`.
- [ ] **Step 2.4: Multi-Tab Editor Integration (`EditorTabs.tsx`)**
  - Tab bar above Monaco editor supporting multiple open files.
  - Tab close, active tab switching, and syntax detection per file extension.
- [ ] **Step 2.5: Pyodide Emscripten VFS Sync**
  - Sync all project files and subfolders into Pyodide `/workspace/` prior to execution.
  - Configure `sys.path` to allow cross-file Python `import` statements.
- [ ] **Step 2.6: Multi-File Snapshot in Experiment Saving**
  - Update `SaveRunAsExperimentModal.tsx` to serialize all project files into `experiment.config.files`.
  - Enable full reproducibility of multi-file experiments.
- [ ] **Step 2.7: Verification & Automated Tests**
  - Add UI tests for File Tree, Multi-Tab switching, dataset upload, and relative import execution.
  - Verify zero TypeScript or build errors.

---

## 9. Acceptance Criteria (Phase 2)

- [ ] **Project Scoping:** Switching the project dropdown instantly loads the specific file tree and code files for that research project.
- [ ] **VS Code File Explorer:** Users can create, rename, and delete nested files and folders in the sidebar.
- [ ] **Entrypoint Selection:** Users can mark any `.py` script as the main execution entrypoint.
- [ ] **Multi-Tab Editing:** Users can open multiple files in tabs and switch between them smoothly.
- [ ] **Dataset Upload:** Users can upload local CSV, JSON, and text datasets into the `data/` folder and inspect them in the editor.
- [ ] **Cross-File Imports:** Running the entrypoint script successfully executes local module imports (e.g. `from utils.metrics import compute_accuracy`).
- [ ] **Cloud Datasets:** Scripts can fetch public online datasets using `pyodide.http.open_url`.
- [ ] **Saved Snapshot:** Saved experiments contain the complete multi-file project snapshot in `config.files`.
- [ ] **Supervisor Mode:** Supervisors can browse all project files and folders in read-only mode (Run, Save, and Edit actions disabled).
- [ ] **Zero Regressions:** All existing Spec 04 experiment tracking and comparison features continue to pass without error.
