# ISSUE-125: Read Kobo authors to improve book matching

**Type:** enhancement
**Priority:** P2
**Labels:** `enhancement`, `desktop`, `search`

Problem:

The Kobo SQL query reads titles and progress but no author. Titles alone leave too many books unmatched or make editions and similar titles hard to distinguish.

Expected:

Read the author alongside the title and use both to find and rank library matches. Show the author in review so users can resolve uncertain matches more easily.

Definition of done:

- Verify the author field against supported Kobo database schemas and include it in the read-only query.
- Carry author metadata through the shared sync contracts and review flow.
- Use title and author together for matching, fuzzy ranking, and library search.
- Keep title-only matching available when author metadata is missing or blank.
- Add coverage for duplicate titles by different authors, author spelling variations, and missing author data.

Context:

- Follow-up to ISSUE-022, e-reader synchronization.
- `apps/bartleby/src-tauri/src/kobo.rs`
- `packages/contracts/src/kobo.ts`
- `packages/frontend/src/renderer/kobo/matching.ts`
