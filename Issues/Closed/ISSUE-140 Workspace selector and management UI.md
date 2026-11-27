# ISSUE-140: Workspace selector and management UI

**Type:** enhancement
**Priority:** P1
**Labels:** `enhancement`, `desktop`, `ui`

Problem:

Users need a quick way to see and change the active workspace from anywhere, and a place to create and maintain workspaces. Part of ISSUE-137 (Phase 3).

Expected:

A workspace selector in the header works on every tab. Settings → Workspaces lists workspaces and lets the user create, rename, archive, restore, and delete them.

Definition of done:

- The header selector switches workspaces without leaving the current tab.
- Create a workspace, optionally copying plan settings from another workspace without its books.
- Rename, archive, and restore workspaces; archived workspaces are hidden from the selector.
- Delete a workspace with confirmation and the option to move its books elsewhere first; at least one workspace always remains.
- Keyboard accessible with visible focus, styled with the existing neo-brutalist tokens and Lucide icons.
- Tests cover create, copy settings, rename, archive, restore, delete, and the last-workspace guard.

Context:

- `packages/frontend/src/renderer/workspaces/`
- `apps/bartleby/src-tauri/src/workspaces/lifecycle.rs`
- `apps/bartleby/src/runtime/tauri-workspace-api.ts`
