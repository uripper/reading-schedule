# ISSUE-049: Replace estimated finish text with interactive element that navigates to that schedule day

**Type:** enhancement
**Priority:** P2
**Labels:** `enhancement`, `ux`, `desktop`

Problem:

The estimated finish date on a book is shown as plain text. It would be more useful as an interactive element that takes the user to that specific day in the Schedule tab.

Expected:

The estimated finish date is represented by a small interactive element. Clicking it navigates to the corresponding day in the Schedule tab.

Definition of done:

- Replace the estimated finish date text with an icon + date combination.
- Clicking the icon navigates to the estimated finish day in the Schedule tab.
- Keyboard activation (Enter/Space) also triggers navigation.
- Add tests for the navigation behavior.

Context:

- `electron/renderer/app/books.ts`
- `electron/renderer/app/schedule.ts`
