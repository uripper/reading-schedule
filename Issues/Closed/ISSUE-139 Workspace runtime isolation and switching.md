# ISSUE-139: Workspace runtime isolation and switching

**Type:** enhancement
**Priority:** P1
**Labels:** `enhancement`, `desktop`, `state`, `planner`

Problem:

With several workspaces in saved state, the renderer and native commands must only ever read and write the active one, and switching must not leak books, plans, or pending saves from one workspace into another. Part of ISSUE-137 (Phase 2).

Expected:

The renderer loads only the active workspace. Saves carry the workspace id and revision and fail on a stale revision instead of overwriting. Switching flushes pending saves, loads the new workspace, and keeps the current tab.

Definition of done:

- Native workspace commands for listing, loading, saving, and switching, exposed through `tauri-workspace-api.ts`.
- Per-workspace `revision` checks reject stale saves with an actionable error.
- Switching flushes pending saves before it changes the active workspace.
- Planner runs are versioned; results are discarded when the workspace changed while planning.
- The last selected workspace reopens on launch.
- Tests cover stale saves, switching with pending saves, and discarded plan runs.

Context:

- `apps/bartleby/src-tauri/src/workspaces/` (`catalog.rs`, `save.rs`, `requests.rs`)
- `apps/bartleby/src-tauri/src/workspace_commands.rs`
- `apps/bartleby/src/runtime/tauri-workspace-api.ts`
- `apps/bartleby/src/runtime/tauri-planner-api.ts`
- `packages/frontend/src/renderer/workspaces/`
