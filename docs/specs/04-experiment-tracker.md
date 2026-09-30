# Spec 04 — Experiment Tracker

## Goal

Implement Module 4 of `feature-plan.md`: structured experiment records, configuration and result storage, dataset/hardware context, output files, experiment history, task linkage, comparison of 2–5 experiments, metrics visualization, final/locked experiments, and Supervisor reproducibility flags. Researchers own and execute experiments; Supervisors inspect, compare, comment, and flag but do not modify experiment results.

**Depends on:** `00-foundation.md`, `01-auth-rbac.md`, `02-research-workspace.md`, shared `FileAsset`

**Agent mode:** Plan mode, Agent-assisted autonomy. Use Review-driven autonomy for authorization and final-lock/state transitions.

## Entities & relations

### Experiment

```text
Experiment {
  id            uuid PK
  projectId     FK→Project
  ownerId       FK→User
  name          string
  purpose       enum(ModelTesting, HyperparameterTuning, DatasetComparison,
                     PerformanceEvaluation, Baseline, Final)
  hypothesis    string?
  date          date
  config        json
  metrics       json
  outputFileIds FK→FileAsset[]
  observation   string?
  status        enum(Draft, Final)
  createdAt     datetime
}
```

Owner access is `ownerId`. Supervisor has read-only + comment access across supervised projects.

### ExperimentFlag

```text
ExperimentFlag {
  id            uuid PK
  experimentId  FK→Experiment
  flaggedBy     FK→User
  type          enum(NeedsRerun, NotReproducible)
  note          string
  raisedTaskId  FK→Task?
  createdAt     datetime
}
```

Only Supervisor of the relevant project can create flags.

### TaskExperimentLink

```text
TaskExperimentLink {
  taskId       FK→Task
  experimentId FK→Experiment
}
```

Access follows the linked Task and Experiment scopes.

## Data shape

`config` should support at minimum:

```json
{
  "model": "RandomForest",
  "hyperparameters": {
    "n_estimators": 500,
    "max_depth": 12
  },
  "dataset": "Dataset A",
  "hardware": "RTX GPU",
  "codeCommit": "abc123",
  "notebookFileId": "uuid",
  "environmentNotes": "Python 3.x..."
}
```

`metrics` should support user-defined metrics:

```json
{
  "accuracy": 0.92,
  "f1": 0.91,
  "rmse": 0.18
}
```

Do not hard-code the UI to only accuracy/F1/RMSE.

## State rules

```text
Draft → Final
```

Once `Final`, the experiment becomes locked from editing.

A Supervisor flag may raise a revision Task.

## API endpoints

> Proposed endpoint contract; exact paths are not fixed in the source docs.

| Method | Path | Roles | Purpose |
|---|---|---|---|
| GET | `/projects/:projectId/experiments` | Project members according to experiment scope | List visible experiments |
| POST | `/projects/:projectId/experiments` | Researcher | Create experiment |
| GET | `/experiments/:id` | Owner; Supervisor of project; other permitted viewer | Read experiment |
| PATCH | `/experiments/:id` | Owner, while `status=Draft` | Edit experiment |
| DELETE | `/experiments/:id` | Owner, while `status=Draft` | Delete own experiment |
| POST | `/experiments/:id/finalize` | Owner | Mark Final |
| GET | `/experiments/compare?ids=a,b,c` | Researcher; Supervisor; Admin view-only where allowed | Compare 2–5 experiments |
| POST | `/experiments/:id/comments` | Supervisor; permitted project participants | Comment |
| POST | `/experiments/:id/flags` | Supervisor of project | Flag as Needs Rerun / Not Reproducible |
| POST | `/tasks/:taskId/experiments` | Task owner / permitted project member | Link experiment to task |
| DELETE | `/tasks/:taskId/experiments/:experimentId` | Authorized owner | Remove link |

### Create experiment

```json
{
  "name": "Baseline RF",
  "purpose": "Baseline",
  "hypothesis": "Random Forest will exceed the baseline F1.",
  "date": "2026-09-15",
  "config": {
    "model": "RandomForest",
    "hyperparameters": {
      "n_estimators": 500
    },
    "dataset": "Dataset A",
    "hardware": "GPU",
    "codeCommit": "abc123"
  },
  "metrics": {
    "accuracy": 0.92,
    "f1": 0.91
  },
  "outputFileIds": ["uuid1"]
}
```

### Flag experiment

```json
{
  "type": "NeedsRerun",
  "note": "Results cannot be reproduced with the recorded configuration."
}
```

Response should include any generated revision task id when the implementation creates one.

## Role behavior

### Researcher

- Creates, edits, and deletes their own Draft experiments.
- Attaches experiments to tasks.
- Records config, metrics, outputs, observations.
- Marks an experiment Final/Reported, after which it is locked.
- Can fully use experiment comparison for experiments they can access.

### Supervisor

- Read-only across supervised-project experiments.
- Can compare experiments and comment.
- Can flag an experiment as Needs Rerun or Not Reproducible.
- A flag may create a revision task for the researcher.

### Admin

- Does not have visibility into experiment parameters/results.
- May only see permitted aggregate/operational metadata if another spec explicitly requires it.

## Acceptance criteria

- [ ] Only Researcher users create experiment records in a supervised project.
- [ ] A Researcher can modify only their own Draft experiments.
- [ ] A Researcher cannot modify an experiment marked `Final`.
- [ ] A Researcher cannot delete an experiment after Finalization.
- [ ] A Supervisor cannot edit experiment config/metrics/results.
- [ ] A Supervisor can read experiments belonging to projects they supervise.
- [ ] Supervisor can compare 2–5 experiments, but the endpoint rejects fewer than 2 or more than 5.
- [ ] Comparison returns aligned parameter/config differences and user-defined metrics.
- [ ] Visual comparison is based on stored metrics, not client-supplied unauthorized data.
- [ ] A Supervisor can create `NeedsRerun` and `NotReproducible` flags only for supervised projects.
- [ ] A flag may create or raise a revision task without granting the Supervisor edit access to the experiment.
- [ ] Task-experiment linking respects both Task and Experiment access rules.
- [ ] Output files use authorized FileAsset access paths.
- [ ] Admin cannot fetch experiment parameters or result payloads through normal APIs.
