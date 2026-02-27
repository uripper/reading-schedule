# ISSUE-052: Add recommendations tab for books by already-read authors

**Type:** enhancement
**Priority:** P2
**Labels:** `enhancement`, `feature`, `ux`, `desktop`

Problem:

There is no way for users to discover and add new books directly within the app. A recommendations surface based on authors already in the user's library would lower the friction of finding the next book.

Current recommendation quality and presentation are not acceptable yet:

- Search quality for English-language results is poor with the current Open Library approach.
- Card sizing/layout is inconsistent and visually messy.
- "Estimated words" adds noise in the recommendation card UI.

Expected:

A Recommendations tab allows users to see relevant books by authors they have already read. Users can quickly add a recommended book to their shelf from this view without leaving the app. Recommendation cards should have normalized sizing, and should not show "Estimated words".

Definition of done:

- Add a Recommendations tab to the main navigation.
- On load, derive a list of authors from the user's existing book library.
- Replace or significantly improve the current Open Library query strategy so English-language recommendations are reliably relevant.
- Display recommended books per author with normalized card and cover sizing.
- Each recommendation has a one-click "Add to shelf" action.
- Remove "Estimated words" from recommendation card display.
- Add tests for author derivation logic and add-to-shelf interaction.
- Add tests for recommendation filtering/ranking behavior under the chosen search strategy.

Context:

- `electron/renderer/app/books.ts`
- `electron/renderer/`
- `electron/index.html`
