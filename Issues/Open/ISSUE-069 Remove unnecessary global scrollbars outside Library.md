# ISSUE-069: Remove unnecessary global scrollbars outside Library

**Type:** bug
**Priority:** P2
**Labels:** `bug`, `ux`, `desktop`

Problem:

The app can show a global scrollbar even when the current layout does not need one. That scrollbar also visually intrudes into the header area, which makes the shell feel unfinished.

Expected:

Global scrollbars only appear when the viewport truly overflows, and they do not run through the header or other fixed shell elements.

Definition of done:

- Eliminate unnecessary outer-page overflow on non-overflowing states.
- Prevent the header area from visually sharing the main content scrollbar.
- Recheck affected tabs after the shell overflow change.
- Verify behavior across common desktop window sizes.

Context:

- `electron/index.html`
- `electron/styles/base.css`
- `electron/styles/today-header.css`
