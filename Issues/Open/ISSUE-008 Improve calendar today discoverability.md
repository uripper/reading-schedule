# ISSUE-008: Improve calendar "today" discoverability


**Type:** enhancement  
**Priority:** P2  
**Labels:** `enhancement`, `desktop`, `ux`

Problem:

"Today" is not obvious enough in the calendar; jumping back to today should be faster.

Expected:

Calendar has a strong visual highlight for today and a dedicated "Today" jump action.

Definition of done:

- Add today highlight style with good contrast.
- Add "Today" button near calendar controls.
- Preserve keyboard accessibility.

Context:

- `electron/renderer/calendar.ts`
- `electron/renderer/calendar/month.ts`
- `electron/renderer/calendar/controls.ts`
- `electron/styles/calendar.css`

