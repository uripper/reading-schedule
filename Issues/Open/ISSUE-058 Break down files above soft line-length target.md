# ISSUE-058: Break down files above soft line-length target

**Type:** tech-debt
**Priority:** P3
**Labels:** `tech-debt`, `refactor`, `desktop`, `python`

Problem:

`pnpm run audit` found 24 files above the 200-line soft limit. The repo currently sits at exactly 90.0% of files under 200 lines (225/250), which leaves no buffer for future growth and increases complexity in key modules.

Expected:

Large files should be split into clearer units with focused responsibilities, while preserving behavior and tests.

Definition of done:

- Refactor the largest files first into smaller modules/functions.
- Keep each file under the 300-line hard limit and improve margin under the 200-line soft target.
- Run relevant tests for touched areas after each split.
- Re-run `pnpm run audit` and improve percentage of files under 200 lines beyond the current 90.0% baseline.

Largest files from today’s audit:

- `electron/renderer/app/calendar_interactions_schedule_updates.ts` (179)
- `electron/renderer/stats/helpers.ts` (176)
- `electron/renderer/books/form_state.ts` (174)
- `electron/renderer/desktop_shortcuts_find.ts` (173)
- `src/reading_plan/greedy.py` (171)
- `electron/renderer/app/calendar_interactions.ts` (168)

Context:

- `/tmp/style-audit.log` (local run output)
- `scripts/style_audit.mjs`
