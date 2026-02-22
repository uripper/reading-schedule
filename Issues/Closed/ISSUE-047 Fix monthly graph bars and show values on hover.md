# ISSUE-047: Fix monthly graph bar appearance and show values on hover with animation

**Type:** enhancement
**Priority:** P2
**Labels:** `enhancement`, `ux`, `desktop`

Problem:

Progress bars on the monthly graph in Stats look visually off. Numbers displayed statically above each bar add clutter without improving readability.

Expected:

The monthly graph bars are clean with no static numbers above them. When the user hovers or highlights a bar, the value appears with a smooth and modern animation in an inline label.

Definition of done:

- Remove statically rendered numbers above monthly graph bars.
- Implement a hover/focus interaction that reveals the bar's value via an animated tooltip or callout.
- Ensure the animation is smooth and does not cause layout shift.
- Add tests for hover state and value display logic.

Context:

- `electron/renderer/app/stats.ts`
- `electron/styles/base.css`
