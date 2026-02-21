# ISSUE-004: Let users edit planned minutes for a scheduled row

**Type:** enhancement  
**Priority:** P1  
**Labels:** `enhancement`, `desktop`, `planner`

Problem:

There is no direct way to adjust planned minutes for an existing day/book row and have downstream totals/projections update.

Expected:

User can edit row minutes from day details and the app recalculates schedule-derived stats/progress consistently.

Definition of done:

- Add editable minutes input for planned rows.
- Recompute row words/projections and persist changes.
- Keep stats/today views in sync after edits.
- Add tests for update behavior.

Context:

- `electron/renderer/calendar/details_progress_form.ts`
- `electron/renderer/app/calendar_interactions.ts`
- `electron/renderer/stats/model.ts`
- `electron/renderer/app/today.ts`
