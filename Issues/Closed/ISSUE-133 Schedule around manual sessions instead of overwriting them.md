# ISSUE-133: Schedule around manual sessions instead of overwriting them

**Type:** bug
**Priority:** P1
**Labels:** `bug`, `desktop`, `planner`

Problem:

Manual sessions are overwritten almost immediately. When a user adds a session to a day, the next automatic replan (triggered by adding the session itself, a book change, a settings change, or day rollover) regenerates that day from scratch and replaces the manual session instead of planning around it. Manual rows are not marked as manual, so the merge step treats future-dated manual sessions like any other generated row and discards them. The planner is also never told that the user has already committed time to that day, so it plans the full daily budget on top of where the manual session was.

Expected:

By default, the scheduler keeps manual sessions and schedules around them. A manual session stays on its day until the user edits or removes it, its minutes count against that day's budget, and its book's planned words count toward the book's remaining work.

Definition of done:

- Mark manual sessions in the schedule row contract so they can be told apart from generated rows.
- Preserve manual sessions on any date during automatic replans and explicit Today replans.
- Pass manual sessions to the planner as reserved minutes, sessions, and books for their dates so generated sessions fill only the remaining budget.
- Account for manual-session words when planning each book's remaining work so books are not over-scheduled or finished late.
- Keep the planner from generating a second session for a book that already has a manual session that day (see ISSUE-135).
- Add regression tests for adding a future manual session, then replanning, and confirming that the session survives and the day's budget accounts for it.

Context:

- `packages/frontend/src/renderer/app/schedule_preserve.ts` (only past days and today survive a replan)
- `packages/frontend/src/renderer/app/plan-replan-policy.ts` (reservations are only built for today's completed rows)
- `packages/frontend/src/renderer/app/calendar_interactions/calendar-interactions-manual-session-update-helpers.ts`
- `packages/contracts/src/types_subfolders/types_planner.ts` (`PlannerScheduleRow`)
- `packages/planner/src/native_planner/parse_reservations.rs`
- `packages/frontend/tests/schedule-preserve.test.mjs`
- `packages/frontend/tests/calendar-manual-session.test.mjs`
