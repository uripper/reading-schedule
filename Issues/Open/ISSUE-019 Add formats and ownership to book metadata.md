# ISSUE-019: Add formats and ownership to book metadata


**Type:** enhancement
**Priority:** P3
**Labels:** `enhancement`, `planner`, `desktop`

Problem:

Current book metadata focuses on title/author/pages; formats (ebook, audiobook, physical) and ownership status are not tracked. Ownership could include `owned`, `borrowed`, `wishlist`, etc...

Expected:

Book metadata includes format and ownership fields, which can inform scheduling and progress tracking.

Definition of done:

- Extend book schema to include `format` and `ownership_status`.
- Update book loading and persistence logic.
- Add UI elements to display and edit these fields in book details.
- Add tests for new metadata fields and their impact on scheduling logic.

