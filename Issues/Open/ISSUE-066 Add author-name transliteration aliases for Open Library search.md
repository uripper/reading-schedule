# ISSUE-066: Add author-name transliteration aliases for Open Library search

**Type:** enhancement
**Priority:** P2
**Labels:** `enhancement`, `feature`, `search`, `desktop`

Problem:

Book lookup quality drops when users type foreign author names in alternate spellings (for example `Doestoevsky` vs `Dostoevsky`). The current Open Library query path does not robustly normalize transliterated aliases, causing misses or weak ranking.

Expected:

Search accepts common transliterated author-name variants, queries Open Library using normalized aliases, and still presents canonical author/title text in results and selected-book fields.

Definition of done:

- Add deterministic author-name alias normalization/transliteration handling for lookup queries.
- Expand search scoring/matching so transliterated variants improve ranking instead of being treated as unrelated text.
- Keep displayed metadata sourced from Open Library response fields rather than replacing result text with query aliases.
- Add tests covering known alias pairs (for example `Dostoevsky` / `Doestoevsky`, `Tolstoy` variants) through query normalization and scoring paths.
- Document supported normalization scope and fallback behavior for unknown names.

Context:

- `electron/main/book_lookup/search_text.ts`
- `electron/main/book_lookup/search_transport.ts`
- `electron/main/book_lookup/search_scoring.ts`
- `electron/main/book_lookup/search_author_scoring.ts`
- `electron/main/book_lookup/index.ts`

