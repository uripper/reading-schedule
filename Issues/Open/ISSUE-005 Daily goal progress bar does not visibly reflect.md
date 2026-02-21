# ISSUE-005: Daily goal progress bar does not visibly reflect completion

**Type:** bug  
**Priority:** P1  
**Labels:** `bug`, `desktop`, `ux`

Problem:

The daily goal can remain visually "gray"/not clearly progressing despite completed minutes.

Expected:

Progress styling should visibly track `todayMinutes / goalMinutes` and match textual value.

Definition of done:

- Fix progress bar rendering logic and/or CSS implementation.
- Verify with manual completion and session logs.
- Add regression test for percentage updates.

Context:

- `electron/renderer/app/today.ts`
- `electron/styles/base.css`
- `electron/index.html`
