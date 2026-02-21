# ISSUE-002: Keep manually removed day-book pairs blocked from replan


**Type:** enhancement  
**Priority:** P1  
**Labels:** `enhancement`, `planner`, `desktop`

Problem:

If a user removes a scheduled row for a specific day/book, replanning can add the same book back on that same day.

Expected:

Manual removal should optionally behave as a "do not schedule this book on this day" constraint for future replans.

Definition of done:

- Persist user day-book block constraints in app state.
- Apply constraints during schedule merge/replan flow.
- Add regression tests for remove-and-replan behavior.

Open design question:

- Should the block be permanent until removed, or only for the next replan?

Context:

- `electron/renderer/app/calendar_interactions.ts`
- `electron/renderer/app/schedule_preserve.ts`
- `electron/renderer/calendar/details_session_items.ts`

