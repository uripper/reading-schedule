# ISSUE-113: Restore finish-day highlight and final session scheduling

**Type:** bug
**Priority:** P1
**Labels:** `bug`, `ux`, `desktop`

Problem:

The Schedule view no longer reliably highlights days where a book is planned to finish, and it appears the final session is sometimes no longer being scheduled at all. That breaks finish forecasting and makes end-of-book days harder to spot.

Expected:

When a book is planned to finish on a given day, the final session should still be scheduled and that day should retain the stronger finish-day highlight.

Definition of done:

- Reproduce the missing finish-day highlight with a deterministic sample or fixture.
- Ensure the planner still schedules the last required session needed to finish a book.
- Restore the stronger finish-day visual treatment for affected days in Schedule.
- Keep finish-date UI in Library and Schedule consistent with the actual planned sessions.
- Add regression coverage for final-session planning and finish-day highlighting.

Context:

- `src/reading_plan/`
- `electron/renderer/books/finish_dates.ts`
- `electron/renderer/books/estimated_finish_groups.ts`
- `electron/renderer/calendar/`

