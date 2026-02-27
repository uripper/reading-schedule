# ISSUE-050: Add holographic/foil effect to finished book cards

**Type:** enhancement
**Priority:** P3
**Labels:** `enhancement`, `ux`, `desktop`

Problem:

Finished books look identical to in-progress books. Adding a visual reward (e.g. a holographic or foil CSS effect on the book card) would make completing a book feel special and reinforce the habit.

Expected:

Book cards in a finished/completed state display a clearly noticeable holographic or foil shimmer effect that is markedly different from unfinished books.

Status note:

Current implementation should not be considered done yet. The visual difference is not strong enough to reliably distinguish read vs non-read cards.

Definition of done:

- Implement a CSS animation or gradient effect that produces a holo/foil appearance on finished book cards.
- Effect is markedly different from non-read cards at normal viewing distance and default zoom.
- Effect should be tasteful and not interfere with text readability.
- Effect is only applied to books in a completed state.
- Add tests to verify the completed-state class is applied correctly.
- Add a quick visual acceptance pass (screenshots or short capture) showing side-by-side read vs non-read cards.

Context:

- `electron/renderer/app/books.ts`
- `electron/styles/base.css`
