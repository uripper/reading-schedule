# ISSUE-007: Show expected pages/% after today's planned session

**Type:** enhancement  
**Priority:** P2  
**Labels:** `enhancement`, `desktop`, `ux`

Problem:

Users want immediate visibility into where they should end up after today's planned session.

Expected:

Today view or day details should display expected end-of-session pages and percentage.

Definition of done:

- Display per-row projected end pages/% for today.
- Keep values consistent with existing estimate logic.
- Add tests for displayed values.

Context:

- `electron/renderer/calendar/estimates.ts`
- `electron/renderer/app/today.ts`
- `electron/renderer/app/today_schedule.ts`
