# ISSUE-055: Phase down no-param-reassign violations in desktop source

**Type:** tech-debt
**Priority:** P2
**Labels:** `tech-debt`, `desktop`, `lint`, `refactor`

Problem:

`pnpm run lint:desktop` currently reports 421 `no-param-reassign` errors. This obscures higher-value regressions and indicates state mutation patterns that are hard to reason about.

Expected:

Parameter mutation should be removed from desktop source where possible, using immutable updates or local variables to make data flow clearer and less error-prone.

Definition of done:

- Create a phased cleanup plan ordered by highest-error files.
- Refactor the first wave of high-volume files without behavior regressions.
- Add/update regression tests where mutation behavior changes are risky.
- Reduce `no-param-reassign` errors by at least 50% in the first pass.

Hot spots from today’s run:

- `electron/renderer/books/form_state.ts`
- `electron/renderer/app/plan_controller.ts`
- `electron/renderer/app/load_state.ts`
- `electron/renderer/calendar/state_runtime.ts`
- `electron/preload.ts`
- `electron/renderer/app/calendar_interactions_types.ts`
- `electron/renderer/app/runtime_helpers.ts`

Context:

- `/tmp/lint-desktop.log` (local run output)
- `electron/renderer/`
- `electron/preload.ts`
