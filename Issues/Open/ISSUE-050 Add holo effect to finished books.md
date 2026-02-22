# ISSUE-050: Add holographic/foil effect to finished book cards

**Type:** enhancement
**Priority:** P3
**Labels:** `enhancement`, `ux`, `desktop`

Problem:

Finished books look identical to in-progress books. Adding a visual reward (e.g. a holographic or foil CSS effect on the book card) would make completing a book feel special and reinforce the habit.

Expected:

Book cards in a finished/completed state display a subtle holographic or foil shimmer effect, visually distinguishing them from unfinished books.

Definition of done:

- Implement a CSS animation or gradient effect that produces a holo/foil appearance on finished book cards.
- Effect should be tasteful and not interfere with text readability.
- Effect is only applied to books in a completed state.
- Add tests to verify the completed-state class is applied correctly.

Context:

- `electron/renderer/app/books.ts`
- `electron/styles/base.css`
