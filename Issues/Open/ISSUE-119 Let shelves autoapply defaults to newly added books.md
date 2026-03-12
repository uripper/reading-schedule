# ISSUE-119: Let shelves auto-apply defaults to newly added books

**Type:** enhancement
**Priority:** P3
**Labels:** `enhancement`, `ux`, `desktop`, `planner`

Problem:

Selecting a shelf during add-book flow does not carry much behavioral intent beyond categorization. Users who organize by shelf often want shelf-specific defaults such as priority, scheduled days, or sequencing hints to apply automatically.

Expected:

Shelves can optionally define add-book defaults that prefill new books with shelf-appropriate planning behavior while remaining editable before save.

Definition of done:

- Allow shelves to define optional defaults for priority, scheduled days, and other supported planning fields.
- Evaluate and support a shelf-level sequencing default such as placing a new book after the last scheduled book on that shelf when appropriate.
- Prefill the add-book dialog from the selected shelf while keeping every auto-applied field user-editable before save.
- Persist and export shelf defaults and document fallback behavior when a shelf has no defaults.
- Add tests for add-book prefills and downstream schedule behavior.

Context:

- `electron/renderer/books/controller_types.ts`
- `electron/renderer/books/dialog.ts`
- `electron/renderer/books/form_refs.ts`
- `electron/renderer/books/shelf.ts`
- `src/reading_plan/`
