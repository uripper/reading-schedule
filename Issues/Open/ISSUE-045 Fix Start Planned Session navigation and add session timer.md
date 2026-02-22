# ISSUE-045: Fix Start Planned Session navigation and add in-session timer

**Type:** bug
**Priority:** P1
**Labels:** `bug`, `enhancement`, `ux`, `desktop`

Problem:

"Start Planned Session" incorrectly navigates the user to the Schedule tab rather than beginning the session in-place on the Today screen. Additionally, there is no visual timer shown during an active session, which reduces engagement and makes it hard to know how much time has elapsed.

Expected:

Clicking "Start Planned Session" begins the session on the Today screen without navigating away. A small, visible session timer appears and counts up (or down) for the duration of the session.

Definition of done:

- Fix the navigation behavior so "Start Planned Session" does not route to the Schedule tab.
- Implement an in-session timer component on the Today screen that activates when a session starts.
- Timer should be dismissible or minimizable without ending the session.
- Add tests for start action, timer state, and session completion flow.

Context:

- `electron/renderer/app/today.ts`
- `electron/renderer/app/today_schedule.ts`
