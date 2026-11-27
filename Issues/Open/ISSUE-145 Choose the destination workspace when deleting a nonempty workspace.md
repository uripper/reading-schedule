# ISSUE-145: Choose the destination workspace when deleting a nonempty workspace

**Type:** enhancement
**Priority:** P3
**Labels:** `enhancement`, `desktop`, `ui`

Problem:

Deleting a workspace that still has books either moves them to the active (or first other) workspace or deletes them. The user cannot pick where the books go.

Expected:

The delete confirmation lets the user choose any other non-archived workspace as the destination for the books.

Definition of done:

- The confirmation lists eligible destination workspaces.
- The move reuses the book transfer rules from ISSUE-141 and stays one atomic transaction with the delete.
- Tests cover choosing a destination and the delete-books path.

Context:

- Follow-up to ISSUE-140 and ISSUE-141.
- `apps/bartleby/src-tauri/src/workspaces/lifecycle.rs`
- `apps/bartleby/src-tauri/src/workspaces/transfer.rs`
- `packages/frontend/src/renderer/workspaces/`
