# ISSUE-073: Add Help/Logs guide for Library

**Type:** tech-debt
**Priority:** P3
**Labels:** `tech-debt`, `docs`, `desktop`

Problem:

The Help/Logs surface does not explain how the Library area works. Users need guidance on adding books, filtering, sorting, editing, and understanding what Library controls affect elsewhere in the app.

Expected:

Help/Logs includes a Library guide that explains core tasks, important controls, and how the library connects to planning and scheduling.

Definition of done:

- Document how to add, edit, and manage books from Library.
- Explain filtering, grouping, sorting, and status concepts in plain language.
- Clarify how Library changes affect scheduling and recommendations.
- Keep the guide concise enough to scan while still covering common user tasks.

Context:

- `electron/renderer/help.ts`
- `electron/index.html`
- `electron/renderer/books/`
