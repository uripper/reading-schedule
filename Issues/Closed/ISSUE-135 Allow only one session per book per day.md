# ISSUE-135: Allow only one session per book per day

**Type:** bug
**Priority:** P2
**Labels:** `bug`, `desktop`, `planner`

Problem:

The schedule can hold more than one session for the same book on the same day. The manual-add dialog lists every book even when that book is already scheduled on the chosen day, and each manual session takes the next free session index for that date. A later generated row for the same book and day can land on the same `date|session_index|book_id` key, and the merge silently keeps only one of them. Splitting one book across several sessions in a day has no clear benefit today, since users can raise a session's minutes and open or close it as needed.

Expected:

Each book has at most one session per day. Adding time for a book that is already on that day updates the existing session instead of creating a second one.

Definition of done:

- When a manual session is added for a book that already has a session on that day, add the minutes to the existing session instead of creating a new row.
- Confirm that the planner emits at most one session per book per day, and enforce it if not.
- Make sure the merge can no longer produce colliding session keys for the same book and day.
- Keep the day-and-book completion key as the matching rule for one book's session on one day.
- Add regression tests for adding a manual session to a day where the book is already scheduled, and for replanning afterward.

Context:

- `packages/frontend/src/renderer/app/calendar_interactions/calendar-interactions-manual-session-update-helpers.ts`
- `packages/frontend/src/renderer/app/calendar_interactions/calendar_interactions_row_helpers.ts`
- `packages/frontend/src/renderer/app/schedule_preserve.ts`
- `packages/frontend/src/renderer/calendar/utils.ts` (`sessionKeyFor`, `dayBookCompletionKey`)
- `packages/planner/src/native_planner/report.rs`
- `packages/frontend/tests/calendar-manual-session.test.mjs`
- Splitting one book into several sessions in a day may come back later as an explicit option with its own UI and design approval.
