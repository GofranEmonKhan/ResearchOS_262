# ResearchOS — Module Spec Index

This folder contains the module-level Antigravity specs derived from:

- `docs/feature-plan.md`
- `docs/data-model.md`
- `docs/specs/00-foundation.md`
- `docs/specs/01-auth-rbac.md`
- `AGENTS.md`

## Build order

1. `00-foundation.md`
2. `01-auth-rbac.md`
3. `02-research-workspace.md`
4. `03-literature-manager.md`
5. `04-experiment-tracker.md`
6. `05-writing-review.md`
7. `06-forum-community.md`
8. `07-marketplace.md`
9. `08-ai-assistant.md`
10. `09-admin-analytics-qa.md`

## Important implementation rule

Where the source documents define entities/workflows but do not prescribe exact HTTP paths, the module file labels its endpoint section as a **proposed implementation contract**. Antigravity should not treat those paths as immutable architecture if the existing codebase already has an established routing convention; it must preserve the source-defined permissions, ownership, and state transitions.

## Agent workflow

For each module:

1. Read `AGENTS.md`.
2. Read `feature-plan.md`, `data-model.md`, and the current module spec.
3. Run Plan mode and review the Plan Artifact.
4. Execute only the approved scope.
5. Run the module acceptance criteria.
6. Review migration files and final diff.
7. Commit before moving to the next module.
