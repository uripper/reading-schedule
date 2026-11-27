# ISSUE-142: All Workspaces view

**Type:** enhancement
**Priority:** P2
**Labels:** `enhancement`, `desktop`, `ui`

Problem:

With reading split across workspaces, there is no single place to see everything at once, so people have to keep switching. Part of ISSUE-137 (Phase 5).

Expected:

Choosing "All Workspaces" in the header selector shows every workspace together on every tab, with the normal UI: one Today carousel with every book, the whole Library, the combined Schedule, and overall Stats. Edits made there are saved to the workspace each book belongs to.

Definition of done:

- The host merges every usable workspace into one snapshot plus ownership data; the renderer applies it through the regular loader.
- Saves from the view are split natively by owner in one transaction, with per-workspace revision checks; reading history stays where it happened.
- Each workspace keeps planning with its own books and settings; planner requests are scoped per workspace.
- New books added in the view must name a workspace before they can be saved.
- Per-workspace plan settings are read-only in the view; the single daily goal stays editable.
- The choice is restored on next launch.
- Tests cover the merged load, split saves, new-book destinations, stale saves, and scoped planning.

Context:

- `apps/bartleby/src-tauri/src/workspaces/combined.rs`, `combined_owners.rs`, `combined_split.rs`
- `packages/frontend/src/renderer/app/init/init-plan-scope.ts`
- `packages/frontend/src/renderer/workspaces/`
