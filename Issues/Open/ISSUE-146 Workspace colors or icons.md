# ISSUE-146: Workspace colors or icons

**Type:** enhancement
**Priority:** P4
**Labels:** `enhancement`, `desktop`, `ui`, `accessibility`

Problem:

Workspaces are identified only by name, which is harder to scan quickly in the header selector and the All Workspaces overview.

Expected:

Users can give a workspace a color or icon as an extra cue. The name always stays visible, so color or icon is never the sole identifier.

Definition of done:

- Add an optional color or icon to the workspace contract and envelope with validation.
- Show it next to the name in the selector, Settings → Workspaces, and aggregate views.
- Meet contrast requirements and keep names visible everywhere.
- Get design approval before adding new controls.
- Tests cover validation and rendering.

Context:

- Follow-up to ISSUE-137.
- `packages/contracts/src/workspaces.ts`
- `apps/bartleby/src-tauri/src/workspace_model/`
- `packages/frontend/src/renderer/workspaces/`
