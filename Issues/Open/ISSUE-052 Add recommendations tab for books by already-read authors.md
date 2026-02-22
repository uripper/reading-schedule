# ISSUE-052: Add recommendations tab for books by already-read authors

**Type:** enhancement
**Priority:** P2
**Labels:** `enhancement`, `feature`, `ux`, `desktop`

Problem:

There is no way for users to discover and add new books directly within the app. A recommendations surface based on authors already in the user's library would lower the friction of finding the next book.

Expected:

A Recommendations tab allows users to see books by authors they have already read. Users can quickly add a recommended book to their shelf from this view without leaving the app.

Definition of done:

- Add a Recommendations tab to the main navigation.
- On load, derive a list of authors from the user's existing book library.
- Display recommended books per author (initially can be a static or locally-derived list; external API integration is a follow-up).
- Each recommendation has a one-click "Add to shelf" action.
- Add tests for author derivation logic and add-to-shelf interaction.

Context:

- `electron/renderer/app/books.ts`
- `electron/renderer/`
- `electron/index.html`
