# ISSUE-147: Kobo sync across workspaces

**Type:** enhancement
**Priority:** P3
**Labels:** `enhancement`, `desktop`, `ux`

Problem:

Kobo sync matches device books only against the active workspace's library. Progress for a book that lives in another workspace is not found, and switching workspaces changes what sync can see.

Expected:

Kobo sync matches books across every workspace and applies progress to the workspace that owns each book.

Definition of done:

- Matching searches every workspace's books; ignored links and reviews stay correct per workspace.
- Updates to non-active workspaces route through native commands with revision checks.
- The sync review shows each book's workspace.
- Tests cover matches in active and non-active workspaces.

Context:

- Follow-up to ISSUE-137.
- `apps/bartleby/src-tauri/src/kobo.rs`
- `packages/frontend/src/renderer/kobo/`
- `apps/bartleby/src-tauri/src/workspaces/`
