# ISSUE-083: Allow removing sessions from Today

**Type:** enhancement
**Priority:** P2
**Labels:** `enhancement`, `ux`, `desktop`

Problem:

Users can see and work through today's sessions from Today, but they do not have a way to remove a session directly from that surface.

Expected:

Users can remove a session from Today without leaving the tab, with appropriate confirmation or recovery behavior.

Definition of done:

- Add a clear remove-session action on Today rows where removal is allowed.
- Reuse or align with the schedule-removal behavior so the app does not create competing rules.
- Update visible state immediately after removal.
- Verify persistence and replan behavior after a Today-side removal.

Context:

- `electron/renderer/app/today/today_schedule.ts`
- `electron/renderer/app/calendar_interactions/calendar_interactions_schedule_updates.ts`
- `electron/renderer/app/schedule_preserve.ts`
