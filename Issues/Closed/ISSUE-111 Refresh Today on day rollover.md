# ISSUE-111: Refresh Today on day rollover

**Type:** bug
**Priority:** P1
**Labels:** `bug`, `ux`, `desktop`

Problem:

If the app stays open while the local day changes, Today can continue showing stale date-bound state from the previous day. That makes the screen feel untrustworthy until the user manually reloads or otherwise forces a refresh.

Expected:

Today should automatically refresh when the local day rolls over so sessions, copy, and derived status always reflect the current day without a manual restart.

Definition of done:

- Detect local day-key changes while the app remains open.
- Refresh Today data and derived presentation when the day changes.
- Ensure completion state, streak-related presentation, and date-specific copy all update to the new day.
- Preserve or safely reset any in-progress Today edit state during rollover.
- Add regression coverage for day rollover without app restart.

Context:

- `electron/renderer/app/today/today.ts`
- `electron/renderer/app/today/today_schedule.ts`
- `electron/renderer/activity/day_minutes.ts`
- `electron/renderer/calendar/utils.ts`

