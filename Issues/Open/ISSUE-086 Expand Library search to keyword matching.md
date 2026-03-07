# ISSUE-086: Expand Library search to keyword matching

**Type:** enhancement
**Priority:** P2
**Labels:** `enhancement`, `search`, `desktop`

Problem:

Library search is effectively title-only today. That is too narrow for users who expect generic keyword search across title, author, series, shelves, and other relevant metadata.

Expected:

Library search behaves like a keyword search field rather than only a title filter.

Definition of done:

- Define which fields participate in keyword matching.
- Update matching logic and UI copy so the control reflects its broader behavior.
- Keep matching performant for the current desktop data model.
- Add regression coverage for representative keyword searches.

Context:

- `electron/renderer/books/controller_render_helpers.ts`
- `electron/renderer/books/toolbar_dom.ts`
- `electron/renderer/title_filter.ts`
