# ISSUE-101: Bring repo clone rate under 0.1 percent

**Type:** tech-debt
**Priority:** P2
**Labels:** `tech-debt`, `refactor`, `tooling`

Problem:

A scoped `jscpd` run against the repository source roots reported 0.96% duplicated lines, which is well above the current 0.1% duplication budget. The largest hotspot is `packages/contracts/src/types_subfolders/types_app.ts`, and there are additional renderer and planner duplicates in areas such as calendar session rendering, book lookup keyboard handling, date-key helpers, and schedule helpers.

Expected:

Repository duplication should be reduced to 0.1% or lower, and clone-rate enforcement should be part of required validation so the target does not regress.

Definition of done:

- Prioritize the highest-value duplicate hotspots first.
- Extract shared types, helpers, or constants instead of copy-pasting near-identical branches.
- Avoid fake abstractions that only move duplication sideways.
- Add a documented `jscpd` command to repository validation.
- Wire clone-rate enforcement into hosted and local required checks.

Context:

- `packages/contracts/src/types_subfolders/types_app.ts`
- `electron/renderer/calendar/details_session_today.ts`
- `electron/renderer/calendar/details_session_past.ts`
- `electron/renderer/book_lookup/keyboard.ts`
- `electron/renderer/app/date_keys.ts`
- `mobile/src/features/today/use_today_data.ts`
- `/tmp/jscpd-reading-schedule/jscpd-report.json`
