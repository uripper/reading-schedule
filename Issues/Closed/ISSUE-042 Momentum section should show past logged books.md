# ISSUE-042: Momentum section should show past logged books and activity

**Type:** enhancement
**Priority:** P2
**Labels:** `enhancement`, `ux`, `desktop`

Problem:

The Momentum section on the Today screen does not surface past logged books or reading history, missing an opportunity to reinforce the user's progress and keep them engaged.

Expected:

Momentum shows a scrollable history of recently completed or actively read books, with at minimum the book title and completion date or last-read date visible.

Definition of done:

- Pull logged book history from state and render it in the Momentum section.
- Show at minimum: book title, author, and completion or last-session date.
- Limit displayed entries to a reasonable recent window (e.g. last 5–10 books).
- Add tests for history data rendering and empty-state handling.

Context:

- `electron/renderer/app/today.ts`
- `electron/renderer/app/today_schedule.ts`
