# ISSUE-114: Keep today outlined in Schedule when another day is selected

**Type:** bug
**Priority:** P2
**Labels:** `bug`, `ux`, `desktop`

Problem:

When the user selects a different day in Schedule, the special visual treatment for today disappears entirely. That removes the easiest home-base reference point in the calendar and makes it harder to reorient after exploring other days.

Expected:

Today should remain visibly outlined even when another day is selected, using a distinct style from the active selection so both states remain easy to understand.

Definition of done:

- Keep a persistent today outline visible whenever the current month is rendered.
- Preserve a separate selected-day style so today and selection do not become ambiguous.
- Ensure keyboard and pointer navigation continue to communicate both states clearly.
- Verify the today outline remains visible after cross-day navigation and tab switches.
- Add regression coverage for simultaneous today and selected-day rendering.

Context:

- `electron/renderer/calendar/month.ts`
- `electron/renderer/calendar/controls.ts`
- `electron/styles/calendar.css`
