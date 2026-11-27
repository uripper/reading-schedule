# ISSUE-138: Workspace contracts, application envelope, and migration

**Type:** enhancement
**Priority:** P1
**Labels:** `enhancement`, `desktop`, `state`, `contracts`

Problem:

Saved state is a single v1 planner snapshot, so there is nowhere to keep more than one library, goal, or schedule. Part of ISSUE-137 (Phase 1).

Expected:

Saved state becomes a versioned application envelope (`state_version: 2`) that holds app-level preferences, feature flags, the active workspace id, and one v1 planner snapshot per workspace. Existing v1 data migrates into a default "My Reading" workspace without losing anything.

Definition of done:

- Shared workspace contracts and validators live in `packages/contracts`.
- The native envelope model validates ids, names, revisions, and the active workspace, and moves every preference (including the single daily goal) and the feature flags out of workspace snapshots.
- v1 state migrates to v2 on load; a one-time backup of the previous data is written as `planner_state.pre_workspaces.json` in the app data folder.
- Journal recovery, the recovery CLI, archive export and import, and the JSON compatibility copy read and write the v2 envelope.
- Tests cover migration, backup creation, validation failures, and archive round trips.

Context:

- `apps/bartleby/src-tauri/src/workspace_model/`
- `apps/bartleby/src-tauri/src/state_store/migrations.rs`
- `apps/bartleby/src-tauri/src/state_store/pre_workspace_backup.rs`
- `apps/bartleby/src-tauri/src/state_store/recovery.rs`
- `apps/bartleby/src-tauri/src/data_archive/`
- `packages/contracts/src/workspaces.ts`
- `packages/contracts/src/types_subfolders/types_workspaces.ts`
