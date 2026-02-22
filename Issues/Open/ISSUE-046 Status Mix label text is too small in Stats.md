# ISSUE-046: "Status Mix" label text is too small in Stats

**Type:** enhancement
**Priority:** P2
**Labels:** `enhancement`, `ux`, `desktop`

Problem:

The "Status Mix" label in the Stats screen is rendered at too small a size, making it hard to read and visually inconsistent with the rest of the section.

Expected:

"Status Mix" is rendered at a size consistent with other section labels in the Stats screen.

Definition of done:

- Locate and increase the font size for the Status Mix label.
- Verify consistency with sibling section labels.
- No layout regressions on the Stats screen.

Context:

- `electron/renderer/app/stats.ts`
- `electron/styles/base.css`
