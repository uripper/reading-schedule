# ISSUE-117: Add manual regenerate action for Today schedule

**Type:** enhancement
**Priority:** P2
**Labels:** `enhancement`, `ux`, `desktop`

Problem:

Today is intentionally stable once rendered, which helps users trust the screen, but there is no explicit way to ask for a fresh schedule for the current day when circumstances change. Users who want a different plan for today have to rely on less direct replan flows.

Expected:

Today stays stable by default, but users can explicitly regenerate today's schedule from the Today surface when they want a different option set.

Definition of done:

- Add a clearly labeled Today action that regenerates today's schedule without making spontaneous changes the default behavior.
- Define the exact contract for the action, including whether it regenerates only today, re-runs the plan while preserving surrounding manual state, or offers both.
- Surface status text that explains what changed after regeneration.
- Preserve manual removals, completions, and other user edits unless the workflow explicitly warns otherwise.
- Add regression coverage for Today regenerate behavior and state preservation.

Context:

- `electron/renderer/app/today/`
- `electron/renderer/app/plan_controller.ts`
- `electron/renderer/app/schedule_preserve.ts`
- `electron/tests/today-schedule.test.mjs`
- `electron/tests/calendar-remove-replan-blocks.test.mjs`
