# ISSUE-034: Add Today Focus Mode with Tiny Start path


**Type:** enhancement
**Priority:** P1
**Labels:** `enhancement`, `ux`, `accessibility`, `desktop`

Problem:

The daily workflow can feel overwhelming when users only need a single obvious next action to begin reading.

Expected:

Today view offers a focused panel with one primary session action and an optional tiny-start fallback.

Definition of done:

- Add Focus Mode entry point from Today and show only the next session action.
- Add Tiny Start option with short default duration and explicit completion feedback.
- Ensure keyboard-first access and focus visibility through the full flow.
- Add tests for start/complete interactions and mode exit behavior.

Context:

- `electron/renderer/app/today.ts`
- `electron/renderer/app/today_schedule.ts`
- `electron/index.html`
- `electron/styles/base.css`

