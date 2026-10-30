# ISSUE-128: Show and remove synced book links in Library

**Type:** enhancement
**Priority:** P2
**Labels:** `enhancement`, `desktop`, `ux`

Problem:

Library books do not expose their link to the synced source book. Users need to see and remove those associations, particularly when switching devices or reading the same book on multiple devices.

Expected:

Show a book's linked sync sources in Library or its book details, with a way to unlink an individual source and match it again later.

Definition of done:

- Display each linked provider, device identity where available, and source book identifier or title.
- Support distinct links for multiple devices without one device's link replacing another's.
- Let users remove one link without deleting the library book, its reading history, or other device links.
- Unlinking must not permanently ignore the source book; it can be matched again on a later review.
- Persist link changes and make conflict handling consistent across devices.
- Add tests for link display, unlinking, rematching, and multiple devices.

Context:

- Follow-up to ISSUE-022, e-reader synchronization.
- Related to ISSUE-124, shared sync language and review flow.
- `packages/contracts/src/types_subfolders/types-kobo.ts`
- `packages/frontend/src/renderer/books/`
- `packages/frontend/src/renderer/kobo/`
