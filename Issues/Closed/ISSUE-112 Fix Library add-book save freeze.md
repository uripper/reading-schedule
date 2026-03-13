# ISSUE-112: Fix Library add-book save freeze

**Type:** bug
**Priority:** P1
**Labels:** `bug`, `ux`, `desktop`

Problem:

Saving a book from the Library add/edit dialog can stall badly enough that the UI feels frozen. In the failure mode reported today, the save button becomes unusable, the dialog never recovers cleanly, and later add/edit attempts can stay blocked even after the user leaves the dialog.

Expected:

Saving a Library book should either complete promptly or fail with an actionable inline warning while leaving the dialog fully editable and recoverable.

Definition of done:

- Validation failures show inline feedback without leaving the dialog stuck in a busy state.
- Reopening the add/edit dialog always restores the save button to a usable idle state.
- Long-running save work such as metadata or cover follow-up work does not make the dialog feel permanently frozen.
- Failed async save paths recover cleanly without blocking later add/edit attempts.
- Add regression coverage for synchronous validation failures and slow/failed async save flows.

Context:

- `electron/renderer/books/dialog.ts`
- `electron/renderer/books/dialog_submit.ts`
- `electron/renderer/books/save.ts`
- `electron/renderer/books/cover_upload.ts`

