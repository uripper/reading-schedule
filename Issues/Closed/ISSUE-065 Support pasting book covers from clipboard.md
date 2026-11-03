# ISSUE-065: Support pasting book covers from clipboard

**Type:** enhancement
**Priority:** P2
**Labels:** `enhancement`, `feature`, `ux`, `desktop`

Problem:

Custom book covers currently require file upload interaction. Users cannot paste an image from the clipboard directly onto the cover area, which adds friction compared to common desktop workflows.

Expected:

Users can paste a clipboard image (for example with `Ctrl+V` while the book dialog is focused) and the app applies it as the custom cover exactly like the upload flow.

Definition of done:

- Handle clipboard image paste events while the book dialog is open.
- Accept supported image mime types and reject unsupported clipboard content with clear user-visible messaging.
- Reuse existing local-cover persistence flow so pasted images are saved and rendered consistently with uploaded covers.
- Preserve existing click-to-upload behavior.
- Add regression tests for successful image paste and invalid clipboard content paths.

Context:

- `packages/frontend/src/renderer/books/cover-upload.ts`
- `packages/frontend/src/renderer/books/cover-upload-staging.ts`
- `packages/frontend/src/renderer/books/dialog.ts`
- `packages/frontend/src/renderer/books/form_refs.ts`
- `apps/bartleby/src-tauri/src/cover_store/`
- `packages/frontend/index.html`
