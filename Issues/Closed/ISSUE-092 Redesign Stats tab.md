# ISSUE-092: Redesign Stats tab

**Type:** enhancement
**Priority:** P2
**Labels:** `enhancement`, `ux`, `desktop`

Problem:

The Stats tab needs a broader design pass. Important information exists, but the surface does not feel visually coherent or polished enough.

Expected:

Stats has a clearer information hierarchy, stronger readability, and a more deliberate presentation of long-term progress.

Definition of done:

- Redesign the Stats layout, cards, and chart presentation together.
- Improve readability of summary metrics and supporting detail text.
- Preserve existing calculations unless explicitly changed by a dependent issue.
- Add or update tests for behavior changed by the redesign.

Context:

- `electron/renderer/stats.ts`
- `electron/renderer/stats/render.ts`
- `electron/renderer/stats/helpers.ts`
- `electron/styles/stats.css`
