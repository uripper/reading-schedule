# ISSUE-082: Fix oversized minutes input in Today edit mode

**Type:** bug
**Priority:** P2
**Labels:** `bug`, `ux`, `desktop`

Problem:

The minutes field becomes disproportionately large after entering edit mode on Today. This breaks visual hierarchy and makes the row look unstable.

Expected:

The editable minutes control should stay visually aligned with the rest of the Today row in both display and edit states.

Definition of done:

- Normalize the edited minutes field size with surrounding row content.
- Preserve readable tap and click targets without oversized typography.
- Verify edit-open and edit-closed states remain visually consistent across common window sizes.
- Add regression coverage for the edit-mode rendering state if practical.

Context:

- `electron/renderer/app/today/today_schedule.ts`
- `electron/renderer/app/today/today_carousel_render.ts`
- `electron/styles/today-carousel.css`
