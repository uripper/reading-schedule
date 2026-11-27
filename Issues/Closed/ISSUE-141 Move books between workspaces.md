# ISSUE-141: Move books between workspaces

**Type:** enhancement
**Priority:** P1
**Labels:** `enhancement`, `desktop`, `state`, `ui`

Problem:

Books added to the wrong workspace, or books whose purpose changes, have to be deleted and re-added, losing progress and settings. Part of ISSUE-137 (Phase 4).

Expected:

Books can be moved to another workspace from Edit Book and Library bulk edit. The move is one atomic native transaction and can be undone.

Definition of done:

- Progress, status, deadlines, covers, and other book settings move with the book.
- Reading history (sessions, completions, and completed or past schedule rows) stays credited to the source workspace.
- After Book (`blocked_by`) links that would cross workspaces must be moved together or removed explicitly; links never cross workspaces.
- Both workspaces bump their revision and are marked for replanning.
- Moves can be undone.
- Tests cover single and bulk moves, history retention, dependency handling, and undo.

Context:

- `apps/bartleby/src-tauri/src/workspaces/transfer.rs`, `transfer_rows.rs`, `transfer_dependencies.rs`
- `apps/bartleby/src-tauri/src/workspaces/tests_transfer.rs`
- `apps/bartleby/src/runtime/tauri-workspace-api.ts`
- `packages/frontend/src/renderer/workspaces/`
