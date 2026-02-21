# ISSUE-009: "After Book" picker shifts dialog layout

**Type:** bug  
**Priority:** P2  
**Labels:** `bug`, `desktop`, `ux`

Problem:

The "After Book" picker expands in a way that pushes form layout unexpectedly.

Expected:

Results should behave like an overlay dropdown and not reflow unrelated form controls.

Definition of done:

- Convert picker results to overlay behavior.
- Stabilize dialog layout while searching/selecting.
- Add regression coverage for picker open/close interactions.

Context:

- `electron/renderer/books/after_book_picker.ts`
- `electron/renderer/books/after_book_picker_helpers.ts`
- `electron/styles/book-dialog.css`
- `electron/index.html`
