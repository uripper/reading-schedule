# ISSUE-143: All Workspaces on Library, Schedule, and Stats

**Type:** enhancement
**Priority:** P2
**Labels:** `enhancement`, `desktop`, `ui`

Problem:

An All Workspaces view limited to Today is confusing: switching tabs would silently show a single workspace again.

Expected:

All Workspaces applies to every tab. Library, Schedule, and Stats show every workspace's books, sessions, and history, and the Workspace field and Library "Move to…" control move books from whichever workspace they are in.

Definition of done:

- Delivered by the merged view of ISSUE-142; no tab has view-specific aggregation code.
- Moving books from a mixed selection transfers each group from its own workspace, with one undo.
- Tests cover ownership lookup and destinations for mixed selections.

Context:

- Follow-up to ISSUE-137 and ISSUE-142.
- `packages/frontend/src/renderer/workspaces/`
