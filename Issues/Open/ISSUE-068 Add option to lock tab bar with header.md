# ISSUE-068: Add option to lock tab bar with header

**Type:** enhancement
**Priority:** P3
**Labels:** `enhancement`, `ux`, `desktop`

Problem:

The tab bar can feel visually disconnected from the header during scrolling. This weakens the shell layout and makes primary navigation feel less anchored.

Expected:

Users can choose whether the tab bar stays locked with the header or scrolls independently, with a sensible default that matches the rest of the app shell.

Definition of done:

- Decide on the default behavior for header and tab-bar locking.
- Add a user-visible option if both behaviors are worth supporting.
- Keep keyboard navigation and focus order intact in either mode.
- Verify the locked layout does not create extra overflow or clipping problems.

Context:

- `electron/index.html`
- `electron/styles/base.css`
- `electron/styles/today-header.css`
