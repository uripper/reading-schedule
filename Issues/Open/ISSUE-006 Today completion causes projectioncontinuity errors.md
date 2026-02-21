# ISSUE-006: "Today completion" causes projection/continuity errors


**Type:** bug  
**Priority:** P0  
**Labels:** `bug`, `planner`, `desktop`

Problem:

Marking today's session as complete can create "ghost" continuity issues in subsequent days (gaps, over-advanced start points, or early completion).

Expected:

Completing today should not break tomorrow onward; projected pages/% and completion logic should remain consistent.

Definition of done:

- Reproduce and codify failing scenarios in tests.
- Fix completion/projection calculations across today/tomorrow boundary.
- Ensure no false "book finished" state while projected % is incomplete.

Context:

- `electron/renderer/calendar/estimates.ts`
- `electron/renderer/app/calendar_interactions_helpers.ts`
- `electron/renderer/app/schedule_preserve.ts`
- `electron/tests/calendar-estimates.test.mjs`
- `electron/tests/today-schedule.test.mjs`

