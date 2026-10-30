# ISSUE-124: Share sync language and review flow across providers

**Type:** enhancement
**Priority:** P2
**Labels:** `enhancement`, `desktop`, `ux`

Problem:

The sync flow uses Kobo-specific language and structure for behavior that can be shared with other ways of syncing. That makes the common review and matching flow harder to reuse.

Expected:

Use shared sync language and controls for reviewing progress, matching books, selecting updates, and handling conflicts. Keep provider names where they identify the source or explain provider-specific setup.

Definition of done:

- Separate the common sync review and import flow from the Kobo database reader and connection settings.
- Make shared contracts and UI support other sync providers without duplicating the Kobo flow.
- Identify the actual source in progress comparisons and conflicts.
- Preserve existing matching, approval, ignore, and retry behavior.
- Add regression coverage for provider-neutral review behavior.

Context:

- Follow-up to ISSUE-022, e-reader synchronization.
- `packages/contracts/src/types_subfolders/types-kobo.ts`
- `packages/frontend/src/renderer/kobo/`
