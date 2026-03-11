# ISSUE-090: Allow marking past scheduled sessions complete

**Type:** enhancement
**Priority:** P2
**Labels:** `enhancement`, `ux`, `desktop`, `planner`

Problem:

If a user finishes a past scheduled session late, the current workflow can make that completion awkward or impossible to reflect cleanly. That creates unnecessary streak and history penalties for ordinary late logging.

Expected:

Users can mark eligible past scheduled sessions complete in a controlled way without corrupting schedule history.

Definition of done:

- Define when a past scheduled session can still be marked complete.
- Support that action in the relevant schedule details workflow.
- Keep streak, stats, and completion history consistent after late completion.
- Add regression coverage for past-session completion behavior.

Context:

- `electron/renderer/calendar/details_session_past.ts`
- `electron/renderer/app/calendar_interactions/calendar_interactions_schedule_updates.ts`
- `electron/renderer/stats/model.ts`
- `electron/renderer/activity/day_minutes.ts`
