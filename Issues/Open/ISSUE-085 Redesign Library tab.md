# ISSUE-085: Redesign Library tab

**Type:** enhancement
**Priority:** P1
**Labels:** `enhancement`, `ux`, `desktop`

Problem:

The Library tab needs a broader design pass. Its current layout and control presentation do not feel polished enough for a primary workflow surface.

Expected:

Library has a clearer visual hierarchy, better control layout, and a more deliberate browsing and management experience.

Definition of done:

- Redesign the Library shell, toolbar, and content presentation together instead of patching isolated controls.
- Improve hierarchy for search, filters, sorting, grouping, and bulk scanning of books.
- Preserve existing library actions and keyboard behavior.
- Add or update tests for any behavior changed during the redesign.

Context:

- `electron/renderer/books/controller.ts`
- `electron/renderer/books/controller_render.ts`
- `electron/renderer/books/toolbar_dom.ts`
- `electron/styles/books-grid.css`
