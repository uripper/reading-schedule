# ISSUE-130: Process book cover transformations in the background

**Type:** bug
**Priority:** P2
**Labels:** `bug`, `desktop`, `ux`

Problem:

Adding a book is still very slow when it includes a cover. Cover transformations should happen in the background so they do not make the add-book flow lag.

Expected:

Save the book promptly and process cover decoding, resizing, normalization, and other transformations without blocking the UI. Update the cover when that work finishes.

Definition of done:

- Profile the add-book path with a cover and identify work blocking the renderer or delaying save completion.
- Move expensive cover transformations off the UI thread and out of the critical book-save path.
- Keep the book usable while cover work is pending, with a stable placeholder or existing preview.
- Persist the completed cover against the correct book and handle edits or deletion while processing is pending.
- Recover from cover-processing failures without losing the saved book or blocking later saves.
- Add regression coverage for slow, large, and failed cover processing, and compare save responsiveness before and after.

Context:

- Follow-up to closed ISSUE-112, Library add-book save freeze; cover-related lag remains.
- `packages/frontend/src/renderer/books/cover_upload.ts`
- `apps/bartleby/src-tauri/src/cover_store/`
- `apps/bartleby/src-tauri/src/state_store/cover_normalization.rs`
