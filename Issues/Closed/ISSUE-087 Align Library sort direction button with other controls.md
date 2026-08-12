# ISSUE-087: Align Library sort direction button with other controls

**Type:** bug
**Priority:** P2
**Labels:** `bug`, `ux`, `desktop`

Problem:

The Library sort-direction button sits higher than the other toolbar controls. That makes the toolbar look uneven and visually sloppy.

Expected:

The sort-direction button aligns cleanly with the rest of the Library toolbar controls.

Definition of done:

- Align the sort-direction button vertically with adjacent toolbar controls.
- Verify alignment across default, focused, and active states.
- Recheck the toolbar on smaller window sizes after the adjustment.

Context:

- `electron/renderer/books/toolbar_dom.ts`
- `electron/renderer/books/toolbar_updates.ts`
- `electron/styles/base.css`
- `electron/styles/books-grid.css`
