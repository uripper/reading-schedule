# ISSUE-089: Allow removing sessions from Schedule

**Type:** enhancement
**Priority:** P2
**Labels:** `enhancement`, `ux`, `desktop`

Problem:

Users need a consistent, discoverable way to remove sessions from the Schedule workflow when plans need manual cleanup.

Expected:

Schedule supports explicit session removal with clear feedback and consistent persistence behavior.

Definition of done:

- Expose remove-session behavior clearly within the Schedule workflow.
- Confirm removal updates schedule rows and completion state correctly.
- Keep removal behavior consistent with Today where both surfaces support it.
- Verify removal does not immediately recreate the same row without user intent.

Context:

- `electron/renderer/calendar/details_session_shared.ts`
- `electron/renderer/app/calendar_interactions/calendar_interactions_schedule_updates.ts`
- `electron/renderer/app/schedule_preserve.ts`
