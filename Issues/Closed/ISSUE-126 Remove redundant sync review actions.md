# ISSUE-126: Remove redundant sync review actions

**Type:** bug
**Priority:** P2
**Labels:** `bug`, `desktop`, `ux`

Problem:

Update all does not seem to work, and Select all already provides a way to choose the batch. Not now also duplicates the X in the top right. These extra buttons make the review more confusing.

Expected:

Keep Select all, Deselect all, and Update selected. Use the shared top-right X to dismiss the review.

Definition of done:

- Remove Update all and its separate import path.
- Remove Not now while preserving the shared X and Escape dismissal.
- Ensure Select all followed by Update selected imports the selected eligible rows.
- Keep conflicts visible and preserve the need to approve uncertain matches individually.
- Closing the review must not import or mark unchecked records as synced.
- Update regression tests and sync documentation for the remaining controls.

Context:

- Follow-up to ISSUE-022, e-reader synchronization.
- `packages/frontend/src/renderer/kobo/review-dialog.ts`
- `packages/frontend/src/renderer/kobo/review-row.ts`
