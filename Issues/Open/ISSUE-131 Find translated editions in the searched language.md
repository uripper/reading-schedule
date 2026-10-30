# ISSUE-131: Find translated editions in the searched language

**Type:** bug
**Priority:** P2
**Labels:** `bug`, `desktop`, `search`

Problem:

Book lookup still returns books in their original language regardless of the language typed into search. Searching with a translated title should find the translated edition.

Expected:

Prefer the title and edition matching the language of the user's search. Selecting the result should keep the translated edition's metadata instead of reverting to the original-language work.

Definition of done:

- Reproduce lookup with a translated title and inspect work-level versus edition-level language metadata.
- Use available translated titles and edition language to rank the relevant translated edition first.
- Carry the selected edition's title, language, and matching metadata through the add-book form and save.
- Preserve useful fallback results when the requested translation is unavailable or the query language is unclear.
- Add tests for the same work searched by original and translated titles and for missing language metadata.

Context:

- Related to ISSUE-066, author-name transliteration; this issue concerns translated titles and edition selection.
- `apps/bartleby/src-tauri/src/book_search/`
- `packages/frontend/src/renderer/book_lookup/`
