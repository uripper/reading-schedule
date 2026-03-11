# ISSUE-043: Clicking a book under Scheduled Today should navigate or show detail

**Type:** bug
**Priority:** P1
**Labels:** `bug`, `ux`, `desktop`

Problem:

Under "Scheduled Today", clicking on a book does nothing. Users expect a tap or click on a book to open detail, navigate to its schedule entry, or offer a contextual action.

Expected:

Clicking a book under Scheduled Today navigates to its entry in the Schedule tab or opens a detail panel with options (e.g. start session, view schedule).

Definition of done:

- Wire a click handler on book items in the Scheduled Today list.
- On click, navigate to the corresponding day/entry in the Schedule tab, or open an inline detail panel.
- Ensure keyboard activation (Enter/Space) also triggers the action.
- Add tests for click and keyboard navigation behavior.

Context:

- `electron/renderer/app/today.ts`
- `electron/renderer/app/today_schedule.ts`
