# ISSUE-142: All Workspaces view

**Type:** enhancement
**Priority:** P3
**Labels:** `enhancement`, `desktop`, `ui`

Problem:

People with several workspaces want to see everything at once without switching. A first version merged every workspace into one view; it was removed before release because a merged save could copy books into the wrong workspace (see the save guard in `apps/bartleby/src-tauri/src/workspaces/save_guard.rs`).

Expected:

A view that shows every workspace together on every tab, without ever letting a save move or copy a book between workspaces.

Definition of done:

- Each record keeps exactly one owner; the native side refuses any save that would place a book in two workspaces or the same book twice.
- Edits route to the owning workspace with per-workspace revision checks; nothing is written when any check fails.
- Each workspace keeps planning with its own books and settings.
- Books added in the view require an explicit workspace.
- Tests cover merged loads, routed saves, refusals, and recovery after a refused save.

Context:

- Part of ISSUE-137 (Phase 5), deferred.
- `apps/bartleby/src-tauri/src/workspaces/`
- `packages/frontend/src/renderer/workspaces/`
