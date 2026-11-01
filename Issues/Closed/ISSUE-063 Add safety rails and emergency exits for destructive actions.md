# ISSUE-063: Add safety rails and emergency exits for destructive actions

**Type:** tech-debt
**Priority:** P2
**Labels:** `ui`, `ux`, `desktop`

Problem:

Destructive actions across the app can still happen with too little friction or recovery. Deleting a book, removing a scheduled session, or clearing other user data should not feel like a one-click irreversible action.

Expected:

Every destructive action should have clear intent confirmation and a recovery path proportionate to its impact.

Definition of done:

- Inventory current destructive actions across Library, Today, Schedule, and Settings.
- Add confirmation copy for irreversible actions and lightweight undo for reversible removal flows.
- Make destructive affordances visually distinct and communicate impact before the action commits.
- Ensure keyboard and screen-reader users can cancel safely and understand what was removed.
- Add regression coverage for affected destructive flows.

Context:

- `electron/renderer/books/`
- `electron/renderer/app/today/`
- `electron/renderer/calendar/`
- `electron/styles/`
