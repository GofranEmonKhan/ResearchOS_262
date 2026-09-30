# Implementation Plan — Module 04: Experiment Tracker

> **Document:** Module 04 Implementation Plan  
> **Location:** `docs/plans/04-experiment-tracker-plan.md`  
> **Status:** ✅ Completed (All 15 Phases Implemented & Verified)  
> **Reference Specs:** [docs/specs/04-experiment-tracker.md](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/docs/specs/04-experiment-tracker.md), [docs/data-model.md](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/docs/data-model.md), [docs/feature-plan.md](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/docs/feature-plan.md), [AGENTS.md](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/AGENTS.md)  
> **Depends on:** Spec 00 (Foundation), Spec 01 (Auth/RBAC), Spec 02 (Research Workspace), Spec 03 (FileAsset sharing)

---

## Table of Contents

1. [Core Architectural & Scientific Integrity Rules](#1-core-architectural--scientific-integrity-rules)
2. [Sub-Feature Phasing Map](#2-sub-feature-phasing-map)
3. [Phase 4.1: Database Schema, Enums & Defense-in-Depth Triggers (✅ Completed)](#phase-41-database-schema-enums--defense-in-depth-triggers)
4. [Phase 4.2: Shared Contracts & TypeScript Interfaces (✅ Completed)](#phase-42-shared-contracts--typescript-interfaces)
5. [Phase 4.3: Storage Policies & FileAsset Attachment Handling (✅ Completed)](#phase-43-storage-policies--fileasset-attachment-handling)
6. [Phase 4.4: Backend — Access Middleware & Permission Guards (✅ Completed)](#phase-44-backend--access-middleware--permission-guards)
7. [Phase 4.5: Backend — Experiment CRUD, State Transitions & Locking (✅ Completed)](#phase-45-backend--experiment-crud-state-transitions--locking)
8. [Phase 4.6: Backend — 2-to-5 Experiment Comparison Engine & Diff Analyzer (✅ Completed)](#phase-46-backend--2-to-5-experiment-comparison-engine--diff-analyzer)
9. [Phase 4.7: Backend — Supervisor Reproducibility Flags & Auto-Revision Tasks (✅ Completed)](#phase-47-backend--supervisor-reproducibility-flags--auto-revision-tasks)
10. [Phase 4.8: Backend — Task-Experiment Linking & Discussion Comments (✅ Completed)](#phase-48-backend--task-experiment-linking--discussion-comments)
11. [Phase 4.9: Frontend — Experiment Hub, Filtering & Comparison Selection (✅ Completed)](#phase-49-frontend--experiment-hub-filtering--comparison-selection)
12. [Phase 4.10: Frontend — Experiment Creator & Dynamic Parameter/Metric Editor (✅ Completed)](#phase-410-frontend--experiment-creator--dynamic-parametermetric-editor)
13. [Phase 4.11: Frontend — Experiment Detail Drawer & Run Inspector (✅ Completed)](#phase-411-frontend--experiment-detail-drawer--run-inspector)
14. [Phase 4.12: Frontend — Side-by-Side Comparison Matrix & Visual Charts (✅ Completed)](#phase-412-frontend--side-by-side-comparison-matrix--visual-charts)
15. [Phase 4.13: Frontend — Supervisor Flagging Workflow & Task Integration (✅ Completed)](#phase-413-frontend--supervisor-flagging-workflow--task-integration)
16. [Phase 4.14: Automated Test Suite & Acceptance Criteria Verification (✅ Completed)](#phase-414-automated-test-suite--acceptance-criteria-verification)
17. [Phase 4.15: Documentation, WORKLOG & Milestone Completion (✅ Completed)](#phase-415-documentation-worklog--milestone-completion)
18. [Execution Progress & Activity Log](#18-execution-progress--activity-log)

---

## 1. Core Architectural & Scientific Integrity Rules

### Ownership & Role Hierarchy

```
+-----------------------------------------------------------------------------------------+
|                                    PROJECT SCOPE                                        |
|                                                                                         |
|   +--------------------------+                         +----------------------------+   |
|   |   Researcher (Owner)     |                         |     Supervisor (PI)        |   |
|   +--------------------------+                         +----------------------------+   |
|   | • Create Experiment      |                         | • Read-Only Inspection     |   |
|   | • Edit (Draft only)      |                         | • Compare 2–5 Experiments  |   |
|   | • Delete (Draft only)    |                         | • Add Discussion Comments  |   |
|   | • Attach to Task (Proof) |                         | • Flag: NeedsRerun         |   |
|   | • Mark "Final" (Locks!)  |                         | • Flag: NotReproducible    |   |
|   | ✘ Cannot edit once Final |                         | • Auto-create Revision Task|   |
|   +--------------------------+                         | ✘ Cannot edit raw metrics  |   |
|                                                        +----------------------------+   |
+-----------------------------------------------------------------------------------------+
```

| Entity | Owner Column | Access Path & Permissions |
| :--- | :--- | :--- |
| `Experiment` | `owner_id` | **Researcher owner**: Full CRUD while in `Draft`. Once `Final`, permanently locked from editing or deletion.<br>**Supervisor**: Read-only access across all experiments in projects they supervise; can compare and comment.<br>**Project Member**: Read-only access across shared project experiments.<br>**Admin**: `403 Forbidden` on experiment contents (AC-18 scientific privacy rule). |
| `ExperimentFlag` | `flagged_by` | **Supervisor only**: Can create flags (`NeedsRerun`, `NotReproducible`) with mandatory review note. Can optionally auto-create a linked revision `Task`.<br>**Researcher**: Reads flags on their experiments. |
| `TaskExperimentLink` | (join table) | Follows both Task and Experiment permissions. Researcher can link their experiments to assigned tasks as deliverable run evidence. |
| `ExperimentComment` | `author_id` | Discussion comments accessible to all project members. Authors can delete their own comments. |
| `FileAsset` | `owner_id` | Shared files table from Spec 03. Used for plots, notebook snapshots, and output CSVs. |

### The Five Inviolable Principles of Module 04

1. **Scientific Data Immutability (Final = Locked)**:
   - When an experiment's status transitions to `Final`, it becomes **permanently read-only**.
   - No user (including the owner and supervisor) may alter `name`, `purpose`, `hypothesis`, `config`, `metrics`, `output_file_ids`, `observation`, or `status`.
   - Finalized experiments cannot be deleted.
   - Enforced in Express service validation **and** by a PostgreSQL database trigger (`prevent_final_experiment_modification`) as defense-in-depth.

2. **Supervisor Non-Interference in Data**:
   - Supervisors govern and inspect research, but **never tamper with raw experimental data**.
   - Supervisors cannot edit hyperparameters, modify metric numbers, or falsify observations.
   - If a supervisor finds errors or discrepancies, they submit an `ExperimentFlag` (`NeedsRerun` or `NotReproducible`), which generates a formal revision task for the researcher.

3. **Admin Privacy Rule (AC-18 Equivalent)**:
   - Mirroring the literature manager privacy rules, platform **Admins cannot view raw experiment parameters, hyperparameters, metrics, or output files**.
   - Normal endpoints return `403 Forbidden` if an Admin attempts to access experiment payloads. Admins only see aggregated operational telemetry (total experiment count, project storage).

4. **Dynamic, User-Defined Parameter & Metric Freedom**:
   - Machine learning and experimental sciences use vastly different metrics (accuracy, F1, loss, BLEU, perplexity, RMSE, $R^2$, latency, throughput, purity %, yield %).
   - The system stores `config` and `metrics` as flexible, indexed `JSONB` structures.
   - The UI and comparison engine dynamically adapt to arbitrary keys without hard-coding schemas to only accuracy/F1/RMSE.

5. **Strict Comparison Bounds (2–5 Experiments)**:
   - `GET /api/v1/experiments/compare?ids=a,b,c` strictly validates that $2 \le \text{count}(ids) \le 5$.
   - Rejects fewer than 2 or more than 5 experiments with `400 Bad Request`.
   - Verifies that the caller has authorized read access to **every** requested experiment ID. If any ID is invalid or belongs to an unauthorized project, returns `403 Forbidden`.

### Resolved Ambiguities & Cross-Module Safeguards

1. **Admin Privacy Rule (AC-18 Alignment)**:
   - *Conflict*: `feature-plan.md` noted "Admin View-only", but `04-experiment-tracker.md` (Line 195) and `AGENTS.md` mandate that Admins cannot view research payloads.
   - *Resolution*: Spec 04 and `AGENTS.md` govern. Express routes block Admin access with `403 Forbidden` on experiment parameters, metrics, observations, and output files.
2. **Postgres Array Foreign Key (`output_file_ids uuid[]`)**:
   - *Issue*: In PostgreSQL, scalar array columns cannot have an inline `FOREIGN KEY REFERENCES file_assets(id)` constraint on individual elements.
   - *Resolution*: Stored as `output_file_ids uuid[] not null default '{}'` and strictly validated against `file_assets` in Express service logic prior to DB write, preserving the exact data model without an unapproved join table.
3. **Supervisor Flagging vs Task State Machine**:
   - *Issue*: Flagging an experiment should not violate the 5-stage task lifecycle (`ToDo → InProgress → Submitted → Approved / RevisionRequested`).
   - *Resolution*: Flagging gives the Supervisor the option to automatically create a dedicated revision task (`status: 'ToDo'`, `priority: 'High'`) assigned to the researcher, complete with a `task_experiment_links` entry.
4. **Notification Types (`notification_type` Enum)**:
   - *Issue*: Avoid overloading existing `RevisionRequested` notification type or creating mismatched client events.
   - *Resolution*: Migration adds `ExperimentFlagged` and `ExperimentCommented` to `notification_type` via `ALTER TYPE ... ADD VALUE IF NOT EXISTS`, fully backwards-compatible with existing workspace notifications.
5. **Co-Supervisor Authority**:
   - *Issue*: Clarify if a `CoSupervisor` can create reproducibility flags.
   - *Resolution*: Both the Project Owner Supervisor and any assigned `CoSupervisor` are verified supervisors in the project and can inspect, comment, and flag experiments (`NeedsRerun` / `NotReproducible`). Neither can edit raw data.
6. **Orphan Storage Asset Cleanup on Draft Deletion**:
   - *Issue*: If a `Draft` experiment is deleted, what happens to uploaded plot files?
   - *Resolution*: Experiments can only be deleted while in `Draft`. When deleted, any associated `file_assets` and their Supabase Storage objects are automatically purged to prevent storage leaks. (Once `Final`, deletion is permanently blocked).
7. **Personal Projects Support**:
   - *Issue*: How do experiments work in Researcher Personal Projects (`is_personal = true`)?
   - *Resolution*: Full CRUD, finalization, and comparison work identically. Supervisor flagging and supervisor comments are automatically disabled because no supervisor is attached.
8. **Draft Runs as Task Evidence**:
   - *Issue*: Can a researcher link a `Draft` run to a task before finalizing it?
   - *Resolution*: Yes. Researchers can link in-progress draft runs. If submitted to a supervisor while still in `Draft`, the UI displays an explicit "Draft Run" badge so the supervisor knows the experiment has not yet been locked.
9. **Metrics JSON Validation & Numeric Parsing**:
   - *Issue*: Prevent arbitrary nested objects from breaking the comparison matrix.
   - *Resolution*: Express validates that `metrics` is a flat key-value map `Record<string, number | string>`, ensuring clean tabular rendering, delta computation, and bar chart generation.
10. **Circular RLS Recursion Prevention**:
    - *Issue*: Prevent reciprocal RLS recursion between `projects`, `project_members`, and `experiments`.
    - *Resolution*: All RLS policies for `experiments`, `experiment_flags`, and `task_experiment_links` strictly reuse the `SECURITY DEFINER` helper functions (`is_project_owner`, `is_project_member`) created in Spec 03.

---

## 2. Sub-Feature Phasing Map

```
+---------------------------------------------------------------------------------------------+
| Phase 4.1: Database Schema, Enums & Defense-in-Depth Triggers (✅ Completed)                 |
|  -- 4 tables, 3 enums, immutability trigger, updated_at trigger, indexes, RLS policies      |
+---------------------------------------------------------------------------------------------+
| Phase 4.2: Shared Contracts & TypeScript Interfaces (`packages/shared-types`) (✅ Completed) |
|  -- Experiment, ExperimentConfig, ExperimentFlag, TaskExperimentLink, DTOs, Comparison types|
+---------------------------------------------------------------------------------------------+
| Phase 4.3: Storage Policies & FileAsset Attachment Handling (✅ Completed)                   |
|  -- Storage bucket 'experiments' RLS policies, multi-file artifact association              |
+---------------------------------------------------------------------------------------------+
| Phase 4.4: Backend — Access Middleware & Permission Guards (`apps/api`) (✅ Completed)       |
|  -- requireExperimentAccess, requireDraftExperiment, requireSupervisorForFlag, Admin block  |
+---------------------------------------------------------------------------------------------+
| Phase 4.5: Backend — Experiment CRUD, State Transitions & Locking (✅ Completed)            |
|  -- List, get, create, patch, delete, finalize endpoints, dynamic JSONB validation         |
+---------------------------------------------------------------------------------------------+
| Phase 4.6: Backend — 2-to-5 Experiment Comparison Engine & Diff Analyzer (✅ Completed)     |
|  -- Parameter alignment, common vs diverging hyperparameter matrix, delta calculations      |
+---------------------------------------------------------------------------------------------+
| Phase 4.7: Backend — Supervisor Reproducibility Flags & Auto-Revision Tasks (✅ Completed)   |
|  -- NeedsRerun / NotReproducible flags, auto-creation of Revision Task, notifications       |
+---------------------------------------------------------------------------------------------+
| Phase 4.8: Backend — Task-Experiment Linking & Discussion Comments (✅ Completed)           |
|  -- Bidirectional task-run evidence linkage, run discussion comments stream                 |
+---------------------------------------------------------------------------------------------+
| Phase 4.9: Frontend — Experiment Hub, Filtering & Comparison Selection (✅ Completed)       |
|  -- /experiments page, project tab view, purpose/status filters, multi-select compare bar   |
+---------------------------------------------------------------------------------------------+
| Phase 4.10: Frontend — Experiment Creator & Dynamic Parameter/Metric Editor (✅ Completed)  |
|  -- Multi-step creator, key-value hyperparameter inputs, metric inputs, artifact uploads     |
+---------------------------------------------------------------------------------------------+
| Phase 4.11: Frontend — Experiment Detail Drawer & Run Inspector (✅ Completed)               |
|  -- Configuration viewer, metric badges, linked task evidence, flag banner, comments        |
+---------------------------------------------------------------------------------------------+
| Phase 4.12: Frontend — Side-by-Side Comparison Matrix & Visual Charts (✅ Completed)        |
|  -- Aligned parameter diff table (amber highlights), metric comparison bar charts, export   |
+---------------------------------------------------------------------------------------------+
| Phase 4.13: Frontend — Supervisor Flagging Workflow & Task Integration (✅ Completed)       |
|  -- Supervisor flag dialog, auto-created revision task preview, resolution workflow         |
+---------------------------------------------------------------------------------------------+
| Phase 4.14: Automated Test Suite & Acceptance Criteria Verification (✅ Completed)          |
|  -- 12/12 acceptance criteria tested in Supertest API suite & React Testing Library UI      |
+---------------------------------------------------------------------------------------------+
| Phase 4.15: Documentation, WORKLOG & Milestone Completion (✅ Completed)                    |
|  -- Update WORKLOG.md, finalize diff, verify clean typecheck and git commit                 |
+---------------------------------------------------------------------------------------------+
```

---

## Phase 4.1: Database Schema, Enums & Defense-in-Depth Triggers (✅ Completed)

**Goal:** Author and apply tracked migration `supabase/migrations/20260904000000_experiment_tracker.sql`.  
**Status:** ✅ Applied to database and verified. Tables (`experiments`, `experiment_flags`, `task_experiment_links`, `experiment_comments`), triggers, and RLS policies are live.

### 1. New Postgres Enums

```sql
create type public.experiment_purpose as enum (
  'ModelTesting',
  'HyperparameterTuning',
  'DatasetComparison',
  'PerformanceEvaluation',
  'Baseline',
  'Final'
);

create type public.experiment_status as enum (
  'Draft',
  'Final'
);

create type public.experiment_flag_type as enum (
  'NeedsRerun',
  'NotReproducible'
);
```

### 2. Table Definitions

#### Table 1: `experiments`
```sql
create table if not exists public.experiments (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  owner_id        uuid not null references public.profiles(id) on delete cascade,
  name            text not null check (char_length(trim(name)) > 0),
  purpose         public.experiment_purpose not null,
  hypothesis      text,
  date            date not null default current_date,
  config          jsonb not null default '{}'::jsonb,
  metrics         jsonb not null default '{}'::jsonb,
  output_file_ids uuid[] not null default '{}',
  observation     text,
  status          public.experiment_status not null default 'Draft',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_experiments_project on public.experiments(project_id);
create index if not exists idx_experiments_owner on public.experiments(owner_id);
create index if not exists idx_experiments_purpose on public.experiments(purpose);
create index if not exists idx_experiments_status on public.experiments(status);
create index if not exists idx_experiments_date on public.experiments(date desc);
create index if not exists idx_experiments_config_gin on public.experiments using gin (config);
create index if not exists idx_experiments_metrics_gin on public.experiments using gin (metrics);
```

#### Table 2: `experiment_flags`
```sql
create table if not exists public.experiment_flags (
  id              uuid primary key default gen_random_uuid(),
  experiment_id   uuid not null references public.experiments(id) on delete cascade,
  flagged_by      uuid not null references public.profiles(id) on delete cascade,
  type            public.experiment_flag_type not null,
  note            text not null check (char_length(trim(note)) > 0),
  raised_task_id  uuid references public.tasks(id) on delete set null,
  resolved_at     timestamptz,
  resolution_note text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_experiment_flags_experiment on public.experiment_flags(experiment_id);
create index if not exists idx_experiment_flags_flagged_by on public.experiment_flags(flagged_by);
```

#### Table 3: `task_experiment_links` (Join Table)
```sql
create table if not exists public.task_experiment_links (
  task_id       uuid not null references public.tasks(id) on delete cascade,
  experiment_id uuid not null references public.experiments(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (task_id, experiment_id)
);

create index if not exists idx_task_experiment_links_experiment on public.task_experiment_links(experiment_id);
create index if not exists idx_task_experiment_links_task on public.task_experiment_links(task_id);
```

#### Table 4: `experiment_comments`
```sql
create table if not exists public.experiment_comments (
  id            uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.experiments(id) on delete cascade,
  author_id     uuid not null references public.profiles(id) on delete cascade,
  body          text not null check (char_length(trim(body)) > 0),
  created_at    timestamptz not null default now()
);

create index if not exists idx_experiment_comments_experiment on public.experiment_comments(experiment_id);
```

### 3. Database Triggers & Immutability Enforcement

#### `updated_at` Trigger
```sql
create trigger on_experiments_updated_at
  before update on public.experiments
  for each row
  execute function public.update_updated_at_column();
```

#### Scientific Integrity Defense-in-Depth Trigger: `prevent_final_experiment_modification`
```sql
create or replace function public.prevent_final_experiment_modification()
returns trigger
language plpgsql
as $$
begin
  -- If the experiment was already Final, prevent any updates to scientific fields
  if OLD.status = 'Final' then
    if (
      OLD.name is distinct from NEW.name or
      OLD.purpose is distinct from NEW.purpose or
      OLD.hypothesis is distinct from NEW.hypothesis or
      OLD.date is distinct from NEW.date or
      OLD.config is distinct from NEW.config or
      OLD.metrics is distinct from NEW.metrics or
      OLD.output_file_ids is distinct from NEW.output_file_ids or
      OLD.observation is distinct from NEW.observation or
      OLD.status is distinct from NEW.status
    ) then
      raise exception 'Finalized experiments are locked and cannot be modified (Scientific Integrity Rule).';
    end if;
  end if;
  return NEW;
end;
$$;

create trigger on_experiment_prevent_final_update
  before update on public.experiments
  for each row
  execute function public.prevent_final_experiment_modification();

-- Also prevent deletion of Finalized experiments
create or replace function public.prevent_final_experiment_deletion()
returns trigger
language plpgsql
as $$
begin
  if OLD.status = 'Final' then
    raise exception 'Finalized experiments are locked and cannot be deleted (Scientific Integrity Rule).';
  end if;
  return OLD;
end;
$$;

create trigger on_experiment_prevent_final_delete
  before delete on public.experiments
  for each row
  execute function public.prevent_final_experiment_deletion();
```

### 4. Row Level Security Policies (Defense-in-Depth)

```sql
alter table public.experiments enable row level security;
alter table public.experiment_flags enable row level security;
alter table public.task_experiment_links enable row level security;
alter table public.experiment_comments enable row level security;

-- Experiments SELECT: Project owner or project member
create policy "Project members can read experiments"
  on public.experiments for select
  using (
    public.is_project_owner(project_id, auth.uid()) or
    public.is_project_member(project_id, auth.uid())
  );

-- Experiments INSERT: Project owner or member (Researcher in supervised project)
create policy "Members can create experiments"
  on public.experiments for insert
  with check (
    auth.uid() = owner_id and (
      public.is_project_owner(project_id, auth.uid()) or
      public.is_project_member(project_id, auth.uid())
    )
  );

-- Experiments UPDATE: Owner only and status must be Draft
create policy "Owners can update draft experiments"
  on public.experiments for update
  using (auth.uid() = owner_id and status = 'Draft')
  with check (auth.uid() = owner_id);

-- Experiments DELETE: Owner only and status must be Draft
create policy "Owners can delete draft experiments"
  on public.experiments for delete
  using (auth.uid() = owner_id and status = 'Draft');

-- Flags: Project members can read
create policy "Project members can read experiment flags"
  on public.experiment_flags for select
  using (
    exists (
      select 1 from public.experiments e
      where e.id = experiment_flags.experiment_id
      and (public.is_project_owner(e.project_id, auth.uid()) or public.is_project_member(e.project_id, auth.uid()))
    )
  );

-- Flags INSERT: Project Owner / Supervisor only
create policy "Supervisors can flag experiments"
  on public.experiment_flags for insert
  with check (
    auth.uid() = flagged_by and
    exists (
      select 1 from public.experiments e
      where e.id = experiment_flags.experiment_id
      and public.is_project_owner(e.project_id, auth.uid())
    )
  );

-- Task Links & Comments follow identical project membership checks
create policy "Project members can read task experiment links"
  on public.task_experiment_links for select
  using (
    exists (
      select 1 from public.experiments e
      where e.id = task_experiment_links.experiment_id
      and (public.is_project_owner(e.project_id, auth.uid()) or public.is_project_member(e.project_id, auth.uid()))
    )
  );

create policy "Project members can manage comments"
  on public.experiment_comments for all
  using (
    exists (
      select 1 from public.experiments e
      where e.id = experiment_comments.experiment_id
      and (public.is_project_owner(e.project_id, auth.uid()) or public.is_project_member(e.project_id, auth.uid()))
    )
  );
```

---

## Phase 4.2: Shared Contracts & TypeScript Interfaces (✅ Completed)

**Goal:** Extend `packages/shared-types/src/index.ts` with comprehensive type definitions, DTOs, validation schemas, and comparison types.  
**Status:** ✅ Implemented and typechecked cleanly (`pnpm -r typecheck` passed with 0 errors). All enums, entities, DTOs, and comparison models are live in `@researchos/shared-types`.

### 1. Enums & Core Entities

```typescript
// ==========================================
// 5. Experiment Tracker Types (Spec 04)
// ==========================================

export type ExperimentPurpose =
  | 'ModelTesting'
  | 'HyperparameterTuning'
  | 'DatasetComparison'
  | 'PerformanceEvaluation'
  | 'Baseline'
  | 'Final';

export const EXPERIMENT_PURPOSES: Record<ExperimentPurpose, ExperimentPurpose> = {
  ModelTesting: 'ModelTesting',
  HyperparameterTuning: 'HyperparameterTuning',
  DatasetComparison: 'DatasetComparison',
  PerformanceEvaluation: 'PerformanceEvaluation',
  Baseline: 'Baseline',
  Final: 'Final',
};

export type ExperimentStatus = 'Draft' | 'Final';

export const EXPERIMENT_STATUSES: Record<ExperimentStatus, ExperimentStatus> = {
  Draft: 'Draft',
  Final: 'Final',
};

export type ExperimentFlagType = 'NeedsRerun' | 'NotReproducible';

export const EXPERIMENT_FLAG_TYPES: Record<ExperimentFlagType, ExperimentFlagType> = {
  NeedsRerun: 'NeedsRerun',
  NotReproducible: 'NotReproducible',
};

export interface ExperimentConfig {
  model?: string;
  hyperparameters?: Record<string, string | number | boolean>;
  dataset?: string;
  hardware?: string;
  codeCommit?: string;
  notebookFileId?: string | null;
  environmentNotes?: string;
  [key: string]: any; // Allow extensible custom fields
}

export type ExperimentMetrics = Record<string, number | string>;

export interface Experiment {
  id: string;
  projectId: string;
  ownerId: string;
  name: string;
  purpose: ExperimentPurpose;
  hypothesis?: string | null;
  date: string;
  config: ExperimentConfig;
  metrics: ExperimentMetrics;
  outputFileIds: string[];
  observation?: string | null;
  status: ExperimentStatus;
  createdAt: string;
  updatedAt: string;
  // Optional enriched fields
  ownerName?: string;
  ownerAvatarUrl?: string | null;
  projectName?: string;
  flags?: ExperimentFlag[];
  linkedTasks?: { id: string; title: string; status: string }[];
  outputFiles?: FileAsset[];
  commentsCount?: number;
}

export interface ExperimentFlag {
  id: string;
  experimentId: string;
  flaggedBy: string;
  type: ExperimentFlagType;
  note: string;
  raisedTaskId?: string | null;
  resolvedAt?: string | null;
  resolutionNote?: string | null;
  createdAt: string;
  flaggedByName?: string;
  raisedTaskTitle?: string | null;
}

export interface TaskExperimentLink {
  taskId: string;
  experimentId: string;
  createdAt: string;
}

export interface ExperimentComment {
  id: string;
  experimentId: string;
  authorId: string;
  body: string;
  createdAt: string;
  authorName?: string;
  authorAvatarUrl?: string | null;
}
```

### 2. Request DTOs & Search Parameters

```typescript
export interface CreateExperimentDto {
  name: string;
  purpose: ExperimentPurpose;
  hypothesis?: string;
  date?: string;
  config?: ExperimentConfig;
  metrics?: ExperimentMetrics;
  outputFileIds?: string[];
  observation?: string;
  status?: ExperimentStatus; // Defaults to Draft
}

export interface UpdateExperimentDto {
  name?: string;
  purpose?: ExperimentPurpose;
  hypothesis?: string | null;
  date?: string;
  config?: ExperimentConfig;
  metrics?: ExperimentMetrics;
  outputFileIds?: string[];
  observation?: string | null;
}

export interface CreateExperimentFlagDto {
  type: ExperimentFlagType;
  note: string;
  createRevisionTask?: boolean; // If true, auto-generates a Task in the project
  taskTitle?: string;
  taskDueDate?: string;
}

export interface AddExperimentCommentDto {
  body: string;
}

export interface LinkTaskExperimentDto {
  experimentId: string;
}

export interface ExperimentSearchParams {
  projectId?: string;
  purpose?: ExperimentPurpose;
  status?: ExperimentStatus;
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}
```

### 3. Comparison Response Model

```typescript
export interface AlignedParameterRow {
  parameterKey: string;
  group: 'model' | 'hyperparameter' | 'dataset' | 'hardware' | 'codeCommit' | 'environment';
  isIdentical: boolean;
  values: Record<string, string | number | boolean | null>; // keyed by experimentId
}

export interface AlignedMetricRow {
  metricKey: string;
  isNumeric: boolean;
  values: Record<string, number | string | null>; // keyed by experimentId
  min?: number;
  max?: number;
  bestExperimentId?: string; // Highest for accuracy, lowest for loss/rmse
}

export interface ExperimentComparisonResponse {
  experiments: Experiment[];
  parameterMatrix: AlignedParameterRow[];
  metricMatrix: AlignedMetricRow[];
  summary: {
    totalCompared: number;
    differingParametersCount: number;
    commonParametersCount: number;
    commonDataset?: string;
  };
}
```

---

## Phase 4.3: Storage Policies & FileAsset Attachment Handling (✅ Completed)

**Goal:** Configure Supabase Storage policies for the private `experiments` bucket (or leverage the existing `file_assets` table) to handle experiment plots, generated predictions CSVs, and Jupyter Notebooks.  
**Status:** ✅ Applied and verified. Migration `supabase/migrations/20260904000001_experiments_storage_policies.sql` created the private `experiments` bucket with authenticated storage RLS policies isolating experiment outputs to project members.

1. **Storage Path Convention**:
   `experiments/{projectId}/{experimentId}/{uuid}.{ext}`
2. **Allowed Mime Types**:
   - Images: `image/png`, `image/jpeg`, `image/svg+xml`, `image/webp` (plots, confusion matrices)
   - Data & Artifacts: `text/csv`, `application/json`, `text/plain` (logs, predictions)
   - Notebooks: `application/x-ipynb+json`, `application/json` (.ipynb files)
3. **Storage Policies (`supabase/migrations/20260904000001_experiments_storage_policies.sql`)**:
   - `SELECT`: Only users who are members of the target `project_id` can download.
   - `INSERT`: Experiment owner can upload into their project/experiment directory.
   - `DELETE`: Prohibited once experiment is `Final`.
4. **Backend Integration**:
   - Uses `apps/api/src/services/fileAsset.service.ts` to generate authenticated signed URLs for download.

---

## Phase 4.4: Backend — Access Middleware & Permission Guards (✅ Completed)

**Goal:** Create `apps/api/src/middleware/experimentGuards.ts` implementing the strict ownership and privacy boundaries.  
**Status:** ✅ Implemented in `apps/api/src/middleware/experimentGuards.ts` and verified by automated security tests. Enforces AC-18 Admin Privacy Rule (`403 Forbidden`), ownership boundaries, and scientific immutability on finalized runs (`409 Conflict`).

### Guard 1: `requireExperimentAccess` (implemented as `requireExperimentViewer`)
- Extracts `experimentId` from `req.params.id` or `req.body.experimentId`.
- Fetches experiment `project_id` and `owner_id`.
- **Admin Block**: If `req.user.role === 'Admin'`, immediately returns `403 Forbidden` with `{ error: 'Admins cannot access experimental research data (AC-18 Privacy Rule).' }`.
- Validates user membership:
  - Caller is the `owner_id` $\rightarrow$ ALLOW.
  - Caller is the Project Owner (Supervisor) $\rightarrow$ ALLOW.
  - Caller is a verified member in `project_members` $\rightarrow$ ALLOW.
  - Non-member $\rightarrow$ REJECT `403 Forbidden`.

### Guard 2: `requireExperimentOwner`
- Verifies `req.user.id === experiment.owner_id`.
- If a Supervisor attempts to edit or delete, returns `403 Forbidden` with `{ error: 'Only the researcher who owns this experiment can modify it.' }`.

### Guard 3: `requireDraftExperiment`
- Checks `experiment.status === 'Draft'`.
- If `experiment.status === 'Final'`, rejects with `409 Conflict`:
  `{ error: 'This experiment has been finalized and is permanently locked from modification (Scientific Integrity Rule).' }`.

### Guard 4: `requireSupervisorForFlag`
- Verifies `req.user.role === 'Supervisor'` AND user is the Project Owner (Supervisor) of the project containing the experiment.
- Researchers cannot flag experiments (`403 Forbidden`).

---

## Phase 4.5: Backend — Experiment CRUD, State Transitions & Locking (✅ Completed)

**Goal:** Implement `apps/api/src/services/experiment.service.ts` and `apps/api/src/routes/experiment.routes.ts`.  
**Status:** ✅ Implemented in `apps/api/src/services/experiment.service.ts` and mounted in `apps/api/src/routes/experiment.routes.ts`. Fully verified by automated tests covering AC-1 through AC-8 (creating drafts, updating, role-based access, irreversible finalization, and conflict handling).

### Endpoint Contract Matrix

| Method | Path | Auth / Role | Guard | Success | Error Codes | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/projects/:projectId/experiments` | Active Member | Project Member | `200 OK` | `401`, `403` | List project experiments with filters & search |
| `POST` | `/api/v1/projects/:projectId/experiments` | Researcher | Project Member | `201 Created` | `400`, `401`, `403` | Create new experiment (Draft or Final) |
| `GET` | `/api/v1/experiments/:id` | Member / Supervisor | `requireExperimentAccess` | `200 OK` | `401`, `403`, `404` | Get single experiment with full details |
| `PATCH` | `/api/v1/experiments/:id` | Owner | `requireDraftExperiment` | `200 OK` | `400`, `403`, `409` | Update draft experiment |
| `DELETE` | `/api/v1/experiments/:id` | Owner | `requireDraftExperiment` | `204 No Content` | `403`, `409`, `404` | Delete draft experiment |
| `POST` | `/api/v1/experiments/:id/finalize` | Owner | `requireDraftExperiment` | `200 OK` | `403`, `409` | Finalize & permanently lock experiment |
| `GET` | `/api/v1/experiments/compare` | Member / Supervisor | Multi-experiment access | `200 OK` | `400`, `403` | Compare 2 to 5 experiments side-by-side |

### Validation Rules
- `name`: String, trimmed, 1–255 characters.
- `purpose`: Must be one of `EXPERIMENT_PURPOSES`.
- `config`: Must be a valid JSON object. Validates sub-properties if present (e.g. `hyperparameters` must be a key-value object).
- `metrics`: Must be a valid JSON object. Key-value pairs where values are numbers or short metric descriptions.
- `output_file_ids`: Array of valid UUIDs corresponding to existing `file_assets`.

---

## Phase 4.6: Backend — 2-to-5 Experiment Comparison Engine & Diff Analyzer (✅ Completed)

**Goal:** Implement `compareExperiments(experimentIds: string[], userId: string)` in `experiment.service.ts`.  
**Status:** ✅ Implemented in `apps/api/src/services/experiment.service.ts` and mounted at `GET /experiments/compare`. Verified by AC-9 and AC-10 tests (strict 2–5 bounds, parameter alignment, diff highlighting, and metric rankings).

### Comparison Logic Flow:

```text
Query: GET /api/v1/experiments/compare?ids=id1,id2,id3
                           │
                           ▼
  1. Validate Count: 2 <= ids.length <= 5
     If invalid: return 400 Bad Request ("Comparison requires between 2 and 5 experiments.")
                           │
                           ▼
  2. Batch Fetch Experiments from DB:
     SELECT * FROM experiments WHERE id = ANY(ids)
     If count != ids.length: return 404 Not Found
                           │
                           ▼
  3. Validate Access for caller:
     For each experiment, check public.is_project_member(project_id, userId)
     If any fails: return 403 Forbidden ("You do not have access to all requested experiments.")
                           │
                           ▼
  4. Extract & Align Hyperparameters:
     - Union all keys in config.hyperparameters across all experiments.
     - For each key:
         values = { [expId]: exp.config.hyperparameters[key] ?? null }
         isIdentical = all non-null values are identical
         row = { parameterKey: key, group: 'hyperparameter', isIdentical, values }
                           │
                           ▼
  5. Align Core Config (model, dataset, hardware, codeCommit):
     - For each core field, create aligned row.
                           │
                           ▼
  6. Extract & Align Metrics:
     - Union all metric keys in metrics across all experiments.
     - For each metric key:
         values = { [expId]: exp.metrics[key] ?? null }
         Calculate min, max, and bestExperimentId (if all values numeric)
                           │
                           ▼
  7. Return ExperimentComparisonResponse
```

---

## Phase 4.7: Backend — Supervisor Reproducibility Flags & Auto-Revision Tasks (✅ Completed)

**Goal:** Implement `apps/api/src/services/experimentFlag.service.ts`.  
**Status:** ✅ Implemented in `apps/api/src/services/experimentFlag.service.ts` and mounted in `apps/api/src/routes/experiment.routes.ts`. Verified by AC-11 tests (flag creation with `NeedsRerun` / `NotReproducible` and automatic generation of high-priority revision task linked to the experiment).

### Endpoints:
- `POST /api/v1/experiments/:id/flags`:
  - Guard: `requireSupervisorForFlag` (Project Owner Supervisor only).
  - Body: `{ type: 'NeedsRerun' | 'NotReproducible', note: string, createRevisionTask?: boolean, taskTitle?: string, taskDueDate?: string }`.
  - Flow:
    1. Verify experiment exists and caller is Project Supervisor.
    2. If `createRevisionTask === true`:
       - Automatically call `task.service.ts` to create a `Task`:
         - `title`: `taskTitle || `[Revision] Re-run Experiment: ${experiment.name}``
         - `description`: `Supervisor Flag (${type}): ${note}`
         - `projectId`: `experiment.project_id`
         - `assigneeId`: `experiment.owner_id`
         - `priority`: `'High'`
         - `status`: `'ToDo'`
         - `dueDate`: `taskDueDate || in 7 days`
       - Link new `taskId` as `raised_task_id`.
       - Create `task_experiment_links` entry linking the new task and experiment.
    3. Insert row into `experiment_flags`.
    4. Dispatch in-app notification to the experiment owner:
       - `type`: `'RevisionRequested'`
       - `payload`: `{ experimentId, flagType: type, note, raisedTaskId }`.
    5. Return `201 Created` with created flag and optional `raisedTaskId`.
- `GET /api/v1/experiments/:id/flags`: List all flags for the experiment.
- `PATCH /api/v1/experiments/flags/:flagId/resolve`:
  - Researcher or Supervisor can record resolution note when a rerun is completed.

---

## Phase 4.8: Backend — Task-Experiment Linking & Discussion Comments (✅ Completed)

**Goal:** Connect experiments directly to workspace milestones and tasks.  
**Status:** ✅ Implemented in `apps/api/src/services/experiment.service.ts` and `apps/api/src/services/experimentComment.service.ts`. Verified by task linking and discussion comment tests.

### 1. Task-Experiment Linking Endpoints
- `POST /api/v1/tasks/:taskId/experiments`:
  - Body: `{ experimentId: string }`
  - Guard: Caller must be task assignee, creator, or supervisor.
  - Action: Inserts into `task_experiment_links`.
- `DELETE /api/v1/tasks/:taskId/experiments/:experimentId`:
  - Action: Removes linkage.
- `GET /api/v1/tasks/:taskId/experiments`:
  - Returns all experiment runs linked to this task as deliverable evidence.

### 2. Experiment Discussion Comments Endpoints
- `POST /api/v1/experiments/:id/comments`:
  - Body: `{ body: string }`
  - Inserts into `experiment_comments`.
- `GET /api/v1/experiments/:id/comments`:
  - Returns paginated discussion comments with author profile information.

---

## Phase 4.9: Frontend — Experiment Hub, Filtering & Comparison Selection (✅ Completed)

**Goal:** Build `apps/web/src/pages/dashboards/ExperimentTrackerPage.tsx` and `apps/web/src/components/experiments/ExperimentCard.tsx`.  
**Status:** ✅ Implemented in `apps/web/src/pages/dashboards/ExperimentTrackerPage.tsx`, `ExperimentCard.tsx`, and mounted in `apps/web/src/App.tsx` and `AppSidebar.tsx`. Verified by automated UI tests (`experiment-tracker-ui.test.tsx`).

### Visual & Interactive Elements:
1. **Header & Quick Metrics Toolbar**:
   - Total Runs, Drafts in Progress, Finalized Baselines, Flagged for Rerun.
   - Primary Action: **"+ New Experiment"** modal trigger.
   - Secondary Action: **"Compare Mode"** toggle button.
2. **Search & Filter Bar**:
   - Debounced search query input (searches experiment name, model, dataset, hypothesis).
   - Purpose Pill Selectors: `All`, `Baseline`, `ModelTesting`, `HyperparameterTuning`, `DatasetComparison`, `Final`.
   - Status Filter: `All`, `Draft`, `Final (Locked)`.
   - Date range selector.
3. **Experiment Grid / List**:
   - Responsive card grid (1 col mobile, 2 col tablet, 3 col desktop).
   - Each `ExperimentCard` displays:
     - Purpose badge (color-coded: violet for ModelTesting, emerald for Baseline, amber for HyperparameterTuning, cyan for Final).
     - Lock icon if `status === 'Final'`.
     - Flag alert pill if flagged (`Needs Rerun` in red/amber).
     - Model name & dataset context.
     - Top 2 primary metrics displayed in prominent visual badges (e.g. `Accuracy: 94.2%`, `F1: 0.931`).
     - Owner avatar, date, and output file count.
     - Comparison checkbox (visible when Compare Mode is enabled or on hover).
4. **Floating Comparison Bar**:
   - Appears at the bottom when $\ge 1$ experiment is selected.
   - Shows selected badges: `"2 / 5 Experiments Selected"`.
   - **"Compare Selected (2–5)"** button (disabled if count $< 2$ or $> 5$).
   - "Clear Selection" button.

---

## Phase 4.10: Frontend — Experiment Creator & Dynamic Parameter/Metric Editor (✅ Completed)

**Goal:** Build `apps/web/src/components/experiments/CreateExperimentModal.tsx`.  
**Status:** ✅ Implemented in `apps/web/src/components/experiments/CreateExperimentModal.tsx`. Features dynamic key-value editors for hyperparameters and metrics, architecture presets, and draft vs finalized lock options.

### Multi-Section Form:
1. **Section 1: General Metadata**:
   - Experiment Name (e.g. `"ResNet-50 Baseline on Dataset v2"`).
   - Purpose dropdown selector (`Baseline`, `ModelTesting`, etc.).
   - Hypothesis (e.g. `"Using AdamW with cosine annealing will improve convergence over SGD."`).
   - Run Date.
2. **Section 2: Configuration & Environment**:
   - Model Name / Architecture.
   - Dataset Name / Version.
   - Hardware description (e.g. `"1x NVIDIA RTX 4090 (24GB)"`).
   - Git Commit Hash / Branch (with quick commit link formatting).
   - Dynamic **Hyperparameter Table Editor**:
     - Key, Value, Type (String / Number / Boolean).
     - "+ Add Hyperparameter" button.
     - Pre-populated presets (e.g. `learning_rate: 0.001`, `batch_size: 64`, `epochs: 100`).
   - Environment Notes (Python version, PyTorch/TensorFlow versions).
3. **Section 3: Metrics & Results**:
   - Dynamic **Metrics Table Editor**:
     - Metric Name (e.g. `val_accuracy`, `f1_macro`, `loss`, `latency_ms`).
     - Numeric/Text Value.
     - "+ Add Metric" button.
4. **Section 4: Attachments & Observations**:
   - Qualitative observation text (researcher notes & reflections).
   - Upload plots, confusion matrices, or prediction CSVs directly via Supabase Storage.
5. **Action Buttons**:
   - "Save as Draft": Allows further edits and metric updates.
   - "Save & Finalize (Lock)": Displays prominent confirmation alert:
     > *"Finalizing this experiment permanently locks all parameters, metrics, and files from further modification to preserve scientific integrity. Continue?"*

---

## Phase 4.11: Frontend — Experiment Detail Drawer & Run Inspector (✅ Completed)

**Goal:** Build `apps/web/src/components/experiments/ExperimentDetailModal.tsx`.  
**Status:** ✅ Implemented in `apps/web/src/components/experiments/ExperimentDetailModal.tsx` with 4 comprehensive tabs (Configuration, Metrics, Linked Tasks, Flags & Discussion) and SSR/test-friendly `initialExperiment` prop support.

### Layout & Tabs:
- **Header**: Title, purpose badge, lock status banner, run date, owner avatar.
- **Top Actions**:
  - Researcher: "Edit Run" (if Draft), "Finalize" (if Draft), "Delete" (if Draft), "Link to Task".
  - Supervisor: "Flag Experiment" (`NeedsRerun` / `NotReproducible`).
- **Tab 1: Configuration & Environment**:
  - Model & dataset badges.
  - Hyperparameter grid with copyable JSON export.
  - Hardware & reproducibility info (Git commit link).
- **Tab 2: Metrics & Visualization**:
  - Metric summary scorecards.
  - Visual plot gallery for uploaded artifacts (confusion matrices, loss curves).
- **Tab 3: Deliverable Evidence & Tasks**:
  - List of linked workspace tasks.
  - "Attach to Task" selector to link run as deliverable proof.
- **Tab 4: Discussion & Flags**:
  - Active Supervisor Flags banner with reason and linked revision task.
  - Discussion comments thread for team feedback.

---

## Phase 4.12: Frontend — Side-by-Side Comparison Matrix & Visual Charts (✅ Completed)

**Goal:** Build `apps/web/src/components/experiments/ExperimentComparisonModal.tsx`.  
**Status:** ✅ Implemented in `apps/web/src/components/experiments/ExperimentComparisonModal.tsx`. Features sticky column headers, parameter diff badges (`DIFF`), numeric ranking trophies (`Trophy`), visual comparative progress bars, CSV spreadsheet export, and Markdown table copy.

### Comparison Interface:
1. **Side-by-Side Sticky Header**:
   - Column per experiment (up to 5 columns) with name, purpose, status, and owner.
2. **Section 1: Configuration Differences**:
   - Highlights differing hyperparameters with an amber/violet indicator pill.
   - Collapsible view for "Identical Parameters" vs "Differing Parameters".
3. **Section 2: Metric Comparison Table & Deltas**:
   - Row per metric.
   - Highlights best metric in green badge.
   - Computes percentage delta relative to the first selected experiment (e.g. `Baseline`).
4. **Section 3: Visual Comparison Chart**:
   - Metric comparison bar chart (using SVG / Tailwind visual bars or Chart.js).
   - Side-by-side grouped bars for shared metrics (`accuracy`, `f1`, `loss`).
5. **Export Toolbar**:
   - "Export Comparison as CSV".
   - "Copy Parameter Matrix as Markdown".

---

## Phase 4.13: Frontend — Supervisor Flagging Workflow & Task Integration (✅ Completed)

**Goal:** Build `apps/web/src/components/experiments/SupervisorFlagModal.tsx`.  
**Status:** ✅ Implemented in `apps/web/src/components/experiments/SupervisorFlagModal.tsx`. Provides `NeedsRerun` / `NotReproducible` flag radio selections, supervisor guidance note input, and automatic creation of high-priority revision tasks linked to the experiment.

### Workflow:
1. Supervisor clicks **"Flag Experiment"** from the run inspector.
2. Modal inputs:
   - Flag Type: Radio selector between **"Needs Rerun"** (e.g. random seed variance or hyperparameter tweak needed) and **"Not Reproducible"** (e.g. missing environment info or diverging results).
   - Required Review Note: Mandatory explanation text.
   - Toggle: **"Automatically create Revision Task for Researcher"** (Checked by default).
   - Task Details (if toggled): Task title pre-filled, priority `High`, due date picker.
3. Submitting calls `POST /api/v1/experiments/:id/flags`.
4. Successfully creates flag, links or raises task, and dispatches in-app notification to the researcher.

---

## Phase 4.14: Automated Test Suite & Acceptance Criteria Verification (✅ Completed)

**Goal:** Author and execute automated Supertest integration tests in `apps/api/src/tests/experiment.test.ts` and React UI tests in `apps/web/src/tests/experiment-tracker-ui.test.tsx`.  
**Status:** ✅ Completed and verified. All 12 formal Acceptance Criteria tests pass with 100% success:
- API Suite: **17/17 tests passing** in `apps/api/src/tests/experiment.test.ts` (Total API suite: **116/116 passed**).
- Web UI Suite: **8/8 tests passing** in `apps/web/src/tests/experiment-tracker-ui.test.tsx` (Total Web suite: **52/52 passed**).
- Monorepo Suite: **168/168 tests passing** across the entire monorepo.

### The 12 Formal Acceptance Criteria Tests:

| # | Test Name | Assertion | Status |
| :--- | :--- | :--- | :--- |
| **AC-1** | Researcher creates experiment in project | Status `201 Created`, record created with `status = 'Draft'`. | ✅ Passing |
| **AC-2** | Supervisor cannot create experiment in project | Status `403 Forbidden` (Supervisor governs, Researcher executes). | ✅ Passing |
| **AC-3** | Researcher edits own Draft experiment | Status `200 OK`, config and metrics updated. | ✅ Passing |
| **AC-4** | Researcher cannot edit another researcher's experiment | Status `403 Forbidden`. | ✅ Passing |
| **AC-5** | Finalized experiment cannot be edited | Status `409 Conflict`, error indicates locked status. | ✅ Passing |
| **AC-6** | Finalized experiment cannot be deleted | Status `409 Conflict`, deletion blocked. | ✅ Passing |
| **AC-7** | Supervisor reads experiments in supervised project | Status `200 OK`, full experiment payload returned. | ✅ Passing |
| **AC-8** | Supervisor cannot modify experiment config/metrics | Status `403 Forbidden` on PATCH. | ✅ Passing |
| **AC-9** | Compare 2 to 5 experiments | Status `200 OK`, returns aligned parameter and metric matrices. | ✅ Passing |
| **AC-10**| Compare $<2$ or $>5$ experiments | Status `400 Bad Request`. | ✅ Passing |
| **AC-11**| Supervisor creates `NeedsRerun` flag with auto-task | Status `201 Created`, flag stored and revision task created in project. | ✅ Passing |
| **AC-12**| Admin cannot access experiment parameters | Status `403 Forbidden` (AC-18 Scientific Privacy Rule). | ✅ Passing |

---

## Phase 4.15: Documentation, WORKLOG & Milestone Completion (✅ Completed)

**Goal:** Verify type safety across packages, update `WORKLOG.md`, generate documentation walkthroughs, and confirm clean build/test status.  
**Status:** ✅ Completed. `pnpm -r typecheck` passes with 0 errors, `WORKLOG.md` is updated with Milestone 5, and walkthrough artifact is generated.

1. Verify `pnpm -r typecheck` passes with zero errors. (✅ Passed — 0 errors)
2. Verify all API tests and UI tests pass. (✅ Passed — 168/168 tests)
3. Update `WORKLOG.md` with Milestone 5 (Spec 04 — Experiment Tracker). (✅ Updated)
4. Review git diff and commit with standard conventional commit message:
   `feat(experiment): complete experiment tracker, comparison matrix and supervisor flags`.

---

## 18. Execution Progress & Activity Log

### Phase Completion Summary Matrix

| Phase | Sub-Feature / Deliverable | Status | Files Created / Modified | Verification & Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 4.1** | Database Schema, Enums & Defense-in-Depth Triggers | ✅ Completed | `supabase/migrations/20260904000000_experiment_tracker.sql` | Applied to Supabase Postgres. 4 tables (`experiments`, `experiment_flags`, `task_experiment_links`, `experiment_comments`), 3 enums, triggers, and RLS policies active. |
| **Phase 4.2** | Shared Contracts & TypeScript Interfaces | ✅ Completed | `packages/shared-types/src/index.ts` | Complete TypeScript type system, DTOs, comparison models, and notification types exported. Contract tests (7/7 passed). |
| **Phase 4.3** | Storage Policies & FileAsset Attachment Handling | ✅ Completed | `supabase/migrations/20260904000001_experiments_storage_policies.sql` | Private Supabase Storage bucket `'experiments'` configured with member-isolated RLS. |
| **Phase 4.4** | Backend Access Middleware & Permission Guards | ✅ Completed | `apps/api/src/middleware/experimentGuards.ts` | AC-18 Admin privacy gate (`403 Forbidden`), ownership enforcement, and immutable draft locking (`409 Conflict`) active. |
| **Phase 4.5** | Backend Experiment CRUD, State Transitions & Locking | ✅ Completed | `apps/api/src/services/experiment.service.ts`, `apps/api/src/routes/experiment.routes.ts` | Endpoints mounted at `/projects/:projectId/experiments` and `/experiments`. Full validation, search, filtering, and finalization. |
| **Phase 4.6** | Backend 2-to-5 Experiment Comparison Engine | ✅ Completed | `apps/api/src/services/experiment.service.ts` | Strict 2–5 experiment bounds, hyperparameter diff detection, and metric ranking engine mounted at `GET /experiments/compare`. |
| **Phase 4.7** | Backend Supervisor Reproducibility Flags & Auto-Tasks | ✅ Completed | `apps/api/src/services/experimentFlag.service.ts` | `NeedsRerun` / `NotReproducible` flagging with automatic high-priority workspace revision task creation and notification dispatch. |
| **Phase 4.8** | Backend Task-Experiment Linking & Comments | ✅ Completed | `task_experiment_links`, `apps/api/src/services/experimentComment.service.ts` | Bidirectional task-run evidence linkage and real-time collaborative discussion threads. |
| **Phase 4.9** | Frontend Experiment Hub, Filtering & Comparison Bar | ✅ Completed | `apps/web/src/pages/dashboards/ExperimentTrackerPage.tsx`, `ExperimentCard.tsx`, `App.tsx`, `AppSidebar.tsx` | Stats ribbon, 7 purpose filter pills, debounced search, responsive card grid, floating multi-select compare bar, and AC-18 Admin Privacy Gate. |
| **Phase 4.10** | Frontend Experiment Creator & Dynamic Editors | ✅ Completed | `apps/web/src/components/experiments/CreateExperimentModal.tsx` | Dynamic key-value editors for hyperparameters and metrics, architecture presets, and draft vs locked finalization modal. |
| **Phase 4.11** | Frontend Experiment Detail Drawer & Run Inspector | ✅ Completed | `apps/web/src/components/experiments/ExperimentDetailModal.tsx` | 4 tabs (Configuration & Environment, Metrics & Observations, Linked Tasks, Flags & Discussion) with SSR/test-friendly initial props. |
| **Phase 4.12** | Frontend Side-by-Side Comparison Matrix | ✅ Completed | `apps/web/src/components/experiments/ExperimentComparisonModal.tsx` | Sticky column headers, parameter diff badges (`DIFF`), metric ranking trophies (`Trophy`), visual comparative bars, CSV export, and Markdown table copy. |
| **Phase 4.13** | Frontend Supervisor Flagging Workflow | ✅ Completed | `apps/web/src/components/experiments/SupervisorFlagModal.tsx` | Supervisor review dialog with issue categories, guidance note, and automated workspace revision task creation. |
| **Phase 4.14** | Automated Test Suite & Acceptance Criteria Verification | ✅ Completed | `apps/api/src/tests/experiment.test.ts`, `apps/web/src/tests/experiment-tracker-ui.test.tsx` | **17/17 API tests passing**, **8/8 UI tests passing**, AC-1 through AC-12 verified. Total monorepo tests: **168/168 passing (100%)**. |
| **Phase 4.15** | Documentation, WORKLOG & Milestone Completion | ✅ Completed | `WORKLOG.md`, `walkthrough.md`, `docs/plans/04-experiment-tracker-plan.md` | Milestone 5 logged in `WORKLOG.md`, `pnpm -r typecheck` passed with 0 errors across all packages. |

### Verification Metrics & Test Suite Health

- **Express API Test Suite (`apps/api`)**: **116 / 116 tests passing** (6 suites: `auth-rbac.test.ts`, `workspace.test.ts`, `literature.test.ts`, `literature-rls.test.ts`, `experiment-contracts.test.ts`, `experiment.test.ts`).
- **React Frontend Test Suite (`apps/web`)**: **52 / 52 tests passing** (5 suites: `auth-rbac-ui.test.tsx`, `landing-page.test.tsx`, `workspace-layout.test.tsx`, `literature-ui.test.tsx`, `experiment-tracker-ui.test.tsx`).
- **Total Monorepo Tests**: **168 / 168 tests passing (100% pass rate)**.
- **Type Safety**: `pnpm -r typecheck` passed with **0 errors**.

