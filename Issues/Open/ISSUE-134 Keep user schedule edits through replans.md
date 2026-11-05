# ISSUE-134: Keep user schedule edits through replans

**Type:** bug
**Priority:** P1
**Labels:** `bug`, `desktop`, `planner`

Problem:

Changes a user makes directly to the schedule do not survive the next replan. Replans run after almost any change (book edits, settings changes, completing a session, or day rollover), so these edits are undone within moments:

- Editing a future session's minutes is lost because the row is regenerated from scratch.
- Removing a session does not stick; the book is scheduled back onto that day. `blockedDayBooks` is still persisted and passed into the merge but is never read, while `persistence.ts` still describes it as keys to keep out of replans.
- An explicit Today replan keeps only completed sessions from today, so unfinished sessions the user added or adjusted for later today are dropped. Automatic replans keep all of today, so the two paths behave differently.
- Marking a future-dated session as done is lost: the replan drops the row and then prunes completion entries that no longer match a row.

Expected:

Edits, removals, and completions the user makes on the schedule are treated as user intent and persist through every kind of replan until the user changes them again. The planner schedules around them instead of replacing them.

Definition of done:

- Preserve user-edited session minutes on any date and reserve that time when replanning.
- Make removing a session keep that book off that day on later replans, and reconcile the `blockedDayBooks` docs and behavior so they agree.
- Keep unfinished user-added or user-edited sessions for today when running an explicit Today replan.
- Keep completion state for future-dated sessions instead of pruning it after a replan, and confirm that reading progress and stats stay consistent.
- Add regression tests covering each case above: edit, remove, Today replan, and future completion, each followed by a replan.

Context:

- `packages/frontend/src/renderer/app/schedule_preserve.ts`
- `packages/frontend/src/renderer/app/plan-replan-policy.ts`
- `packages/frontend/src/renderer/app/plan_controller_apply.ts`
- `packages/frontend/src/renderer/app/persistence.ts`
- `packages/frontend/src/renderer/app/calendar_interactions/calendar-interactions-schedule-update-helpers.ts`
- `packages/frontend/tests/schedule-preserve.test.mjs`
- Related to ISSUE-133, which covers manual sessions; both likely share the same "user-owned row" marker and reservation path.
