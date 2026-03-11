# ISSUE-051: Fix session layout and typography in Schedule

**Type:** enhancement
**Priority:** P1
**Labels:** `enhancement`, `ux`, `desktop`

Problem:

Session rows in the Schedule tab have multiple layout and typography problems:

- Font sizes are inconsistent and disproportionate.
- The pencil (edit) icon is too far from the minutes value it controls.
- The minutes value remains visible on screen while the planned-minutes input is open, creating a redundant/confusing display.
- The overall session row appearance is cluttered and visually unpolished.

Expected:

Session rows are clean and well-proportioned. The pencil icon sits immediately adjacent to the minutes value. When the planned-minutes input is open, the static minutes value is hidden. Font sizes are consistent and appropriate throughout.

Definition of done:

- Audit and normalize font sizes across session row elements.
- Move the pencil icon to be directly adjacent to the minutes display.
- Hide the static minutes value when the inline edit input is active.
- General polish pass on session row spacing, alignment, and visual hierarchy.
- No regressions in edit/save functionality.
- Add or update tests for the edit-open/edit-closed display states.

Context:

- Related to ISSUE-037 (pencil icon and planned minutes interaction).
- `electron/renderer/app/schedule.ts`
- `electron/styles/base.css`
