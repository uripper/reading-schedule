# ISSUE-118: Add sub-shelves in Library

**Type:** enhancement
**Priority:** P3
**Labels:** `enhancement`, `ux`, `desktop`

Problem:

Library shelves are flat, which makes it hard to organize larger collections or keep related reading tracks together without proliferating top-level shelf names.

Expected:

Users can create and browse sub-shelves so Library organization supports nested groupings without losing the simplicity of the current shelf model.

Definition of done:

- Define a shelf model that supports at least one nested level and stable persistence and export behavior.
- Let users create, rename, move, and filter by sub-shelf from normal Library workflows.
- Render parent and child shelf context clearly in Library browsing and add/edit flows.
- Preserve existing shelves without migration surprises.
- Add tests for shelf persistence, filtering, and add/edit assignment behavior.

Context:

- `electron/renderer/books/shelf.ts`
- `electron/renderer/books/controller.ts`
- `electron/renderer/books/dialog.ts`
- `electron/renderer/books/toolbar_dom.ts`
- `electron/styles/books-grid.css`
