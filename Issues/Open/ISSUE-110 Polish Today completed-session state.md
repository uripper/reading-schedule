# ISSUE-110: Polish Today completed-session state

**Type:** enhancement
**Priority:** P2
**Labels:** `enhancement`, `ux`, `desktop`

Problem:

Completing a session on Today does not feel visually decisive enough. The state change is mostly limited to `Completed` turning green, completed rows remain mixed with unfinished rows, completed text can still read like subdued hint copy, and pre-completion copy like `After Session` can linger after the task is done.

Expected:

Completing a Today session should feel clearly complete, reward the action visually, and move completed items out of the way so the remaining work is easier to scan while keeping completed text easy to read.

Definition of done:

- Add a noticeable but tasteful completion transition when the user logs a session from Today.
- Strengthen the completed visual treatment for the associated book/session card, for example with a subtle green overlay or semi-translucent cover treatment that still preserves readability.
- Use normal high-contrast body text for completed book/session copy instead of hint-styled text that blends with incomplete or log-session states.
- Remove or replace `After Session` copy once the session is completed so the row no longer shows pre-completion guidance.
- Move completed items to the end of the active Today list or into a clearly separated completed section after completion.
- Preserve keyboard and screen-reader clarity for any new completed-state affordances.
- Add regression coverage for completed-state rendering and ordering.

Context:

- `electron/renderer/app/today/`
- `electron/styles/today-*.css`
- `electron/renderer/books/`
