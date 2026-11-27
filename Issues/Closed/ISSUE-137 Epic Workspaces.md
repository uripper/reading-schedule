# ISSUE-137: Epic: Workspaces

**Type:** enhancement
**Priority:** P1
**Labels:** `enhancement`, `epic`, `desktop`, `state`, `ui`

Problem:

Bartleby holds one library, one daily goal, one planner configuration, and one schedule. People who read for different purposes (for example Career, Personal, and French) have to mix those books into a single plan, so goals, stats, and schedules blur together.

Expected:

Workspaces are independent reading and planning environments. Each workspace has its own library and shelves, planner settings, schedule, completions, manual exclusions, and reading history. One daily goal covers every workspace. Theme, accessibility, time zone, feature flags, window state, covers, backups, and the last selected workspace stay app-level.

Definition of done:

- ISSUE-138: Workspace contracts, application envelope, and migration (Phase 1).
- ISSUE-139: Workspace runtime isolation and switching (Phase 2).
- ISSUE-140: Workspace selector and management UI (Phase 3).
- ISSUE-141: Move books between workspaces (Phase 4).
- ISSUE-142: All Workspaces view (Phase 5) — deferred; see the issue for the safety requirements.
- Deferred follow-ups tracked in ISSUE-142, ISSUE-144, ISSUE-145, ISSUE-146, and ISSUE-147.

Architecture decision:

- Chosen: a single versioned application snapshot (`state_version: 2`) kept in the existing single SQLite snapshot row and journal, nesting one v1 planner snapshot per workspace: `{state_version: 2, active_workspace_id, app_preferences, feature_flags, workspaces: [{id, name, archived, created_at, revision, needs_replan, snapshot}]}`.
- Why: least disruptive. Creation, deletion, and transfers are atomic through one journal transaction. Journal recovery, archive export and import, the recovery CLI, and the JSON compatibility copy keep treating the app as one value. Renderer and native planner payloads are unchanged.
- Rejected: one row per workspace (needs cross-row transactions and reworked recovery) and full normalization (out of scope).
- Costs: every save rewrites every workspace's JSON, which is acceptable for local single-user data sizes. Older app versions cannot read v2 state.

Invariants:

- Workspace ids are immutable.
- Each book belongs to exactly one workspace.
- A per-workspace `revision` makes stale renderer saves fail instead of overwriting newer data.
- Every preference, including the single daily goal, and the feature flags live in the envelope.
- The renderer shows one workspace at a time. Every save names the workspace its data came from (set only once that data is fully on screen), and the native side refuses a save that names another workspace, lists a book twice, or contains a book stored in another workspace. A refused out-of-date save reloads the workspace instead of retrying.
- Reading history (sessions, completions, and completed or past schedule rows) never moves with a book.
- `blocked_by` (After Book) links never cross workspaces.
- Planner results are discarded when the workspace changed while planning (plan-run versioning), and switching saves pending edits first. Opening a workspace reads without writing; the choice for next launch is saved in the background.

Context:

- `apps/bartleby/src-tauri/src/workspace_model/`
- `apps/bartleby/src-tauri/src/workspaces/`
- `apps/bartleby/src-tauri/src/state_store/migrations.rs`
- `packages/contracts/src/workspaces.ts`
- `packages/contracts/src/types_subfolders/types_workspaces.ts`
- `apps/bartleby/src/runtime/tauri-workspace-api.ts`
- `packages/frontend/src/renderer/workspaces/`
