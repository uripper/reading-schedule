# ISSUE-086: Expand Library search to keyword matching

**Type:** enhancement
**Priority:** P2
**Labels:** `enhancement`, `search`, `desktop`

Problem:

Library search is effectively title or author today. That is too narrow for users who expect generic keyword search across title, author, series, shelves, pages, and other relevant metadata.

Expected:

Library search behaves like a keyword search field rather than only a title or author filter.

Definition of done:

- Define which persisted fields participate in keyword matching. Series is not currently a book field; do not imply series search works without an explicit schema change.
- Update matching logic and UI copy so the control reflects its broader behavior.
- Keep matching performant for the current desktop data model.
- Add regression coverage for representative keyword searches.

Context:

- `packages/frontend/src/renderer/books/controller_render_helpers.ts`
- `packages/frontend/src/renderer/books/toolbar_dom.ts`
- `packages/frontend/src/renderer/title_filter.ts`
