# ISSUE-127: Use source last-read date when syncing a finished book

**Type:** bug
**Priority:** P2
**Labels:** `bug`, `desktop`, `planner`

Problem:

When a synced book is at 100%, its source last-read date is not being used as the finished date. The book should reflect when it was finished on the device.

Expected:

When a user approves a 100% progress record, use its DateLastRead as the book's finished date after normalizing the timestamp to the application's date convention.

Definition of done:

- Set the finished date from a valid source last-read date when importing 100% progress.
- Handle an already-100% library match with a missing finished date as an actionable completion-date update.
- Make a different existing finished date visible for review before replacing it.
- Invalid or ambiguous source dates must not silently produce an incorrect finished date.
- Repeated syncs must not create duplicate completion history.
- Add regression tests for new completion, equal progress, existing dates, and timezone/day boundaries.

Context:

- Follow-up to ISSUE-022, e-reader synchronization.
- `packages/frontend/src/renderer/kobo/model.ts`
- `packages/frontend/src/renderer/kobo/import.ts`
- `packages/frontend/src/renderer/books/progress.ts`
