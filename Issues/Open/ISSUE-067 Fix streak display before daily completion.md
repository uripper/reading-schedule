# ISSUE-067: Fix streak display before daily completion

**Type:** bug
**Priority:** P1
**Labels:** `bug`, `ux`, `desktop`

Problem:

The displayed streak count does not persist cleanly from day to day. It only feels trustworthy after a session is completed, which makes it look like the user already lost their streak before they finish the current day.

Expected:

The streak display should preserve the prior streak while the current day is still in progress and only drop when the user has actually missed the day according to the defined streak policy.

Definition of done:

- Show the current streak as soon as the app loads, not only after a session is completed.
- Do not make the streak appear lost during an in-progress day before the user has had a chance to finish scheduled reading.
- Ensure the displayed streak updates consistently across Today and Stats.
- Add regression coverage for day rollover and pre-completion rendering.

Context:

- `electron/renderer/app/today/today.ts`
- `electron/renderer/app/today/today_header.ts`
- `electron/renderer/activity/day_minutes.ts`
- `electron/renderer/stats/model.ts`
