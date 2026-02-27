# ISSUE-052: Add recommendations tab for books by already-read authors

**Type:** enhancement
**Priority:** P1
**Labels:** `enhancement`, `feature`, `ux`, `desktop`

Problem:

There is no way for users to discover and add new books directly within the app. A recommendations surface based on authors already in the user's library would lower the friction of finding the next book.

Current recommendation quality and presentation are not acceptable yet:

- Search quality for English-language results is poor with the current Open Library approach.
- Recommendation import correctness is weak (irrelevant items and non-book entries appear).
- Duplicate recommendations appear too often for the same author/title.
- Card sizing/layout is inconsistent and visually messy.
- "Estimated words" adds noise in the recommendation card UI.

Expected:

A Recommendations tab allows users to see relevant books by authors they have already read. Users can quickly add a recommended book to their shelf from this view without leaving the app. Recommendation imports should prefer real books, dedupe reliably, and render with normalized card layouts without "Estimated words" noise.

Definition of done:

- Add a Recommendations tab to the main navigation.
- On load, derive a list of authors from the user's existing book library.
- Replace or significantly improve the current Open Library query strategy so English-language recommendations are reliably relevant.
- Filter out non-book candidates with deterministic heuristics before rendering.
- Improve import correctness by validating author/title matches and rejecting malformed rows.
- Deduplicate recommendations by normalized title+author before display.
- Display recommended books per author with normalized card and cover sizing.
- Each recommendation has a one-click "Add to shelf" action.
- Remove "Estimated words" from recommendation card display.
- Add tests for author derivation logic and add-to-shelf interaction.
- Add tests for recommendation filtering, dedupe, and ranking behavior under the chosen search strategy.

Context:

- `electron/renderer/recommendations/`
- `electron/main/book_lookup/`
- `electron/renderer/`
- `electron/index.html`
