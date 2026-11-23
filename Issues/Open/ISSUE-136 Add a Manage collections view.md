# ISSUE-136: Add a Manage collections view

**Type:** enhancement
**Priority:** P2
**Labels:** `enhancement`, `ui`

Problem:

Collections can only be created and assigned from the Edit Book collections picker. There is no place to rename a collection or delete one, so a typo or an outdated collection has to be fixed by editing every book that uses it.

Expected:

A simple Manage collections view, reachable from Settings or the Library collections filter, lists every collection with its book count and lets the user rename or delete it.

Definition of done:

- List all collections with the number of books in each.
- Rename a collection; the change applies to every book in it. Renaming to an existing name merges the two after confirmation.
- Delete a collection; ask for confirmation when it still has books, and remove it from those books without changing anything else about them.
- Keyboard accessible with visible focus, styled with the existing neo-brutalist tokens and Lucide icons.
- Tests cover rename, merge, and delete.

Context:

- `packages/frontend/src/renderer/books/collection.ts`, `collection_options.ts`, `collection_bulk.ts`
- Split out of the UI overhaul so that PR stays focused. A colour per collection is out of scope because it needs a data model and contract change.
