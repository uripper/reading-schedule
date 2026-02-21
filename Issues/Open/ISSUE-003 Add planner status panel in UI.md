# ISSUE-003: Add planner status panel in UI


**Type:** enhancement  
**Priority:** P1  
**Labels:** `enhancement`, `desktop`, `planner`

Problem:

Users do not have a clear persistent view of planner mode, fallback events, solver status, objective, and notes.

Expected:

A visible planner status area should show:

- planner requested vs planner actually used
- solver status
- note/fallback reason
- objective value (when available)

Definition of done:

- Add planner status component to the UI.
- Populate from `summary` and `result` metadata.
- Add renderer tests for display logic.

Context:

- `electron/renderer/app/plan.ts`
- `electron/renderer/app/plan_controller.ts`
- `electron/renderer/app/types.ts`
- `src/reading_plan/solve.py`

