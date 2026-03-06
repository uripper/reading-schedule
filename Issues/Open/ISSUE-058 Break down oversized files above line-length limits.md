# ISSUE-058: Break down oversized files above line-length limits

**Type:** tech-debt
**Priority:** P3
**Labels:** `tech-debt`, `refactor`, `desktop`, `python`

Problem:

Multiple files now exceed the repo's file-size standards. Several modules are above the 300-line hard limit, and a larger set sits well above the 200-line soft target. This makes the code harder to reason about and leaves little safety margin against future growth.

Expected:

Oversized files should be split into clearer units with focused responsibilities while preserving behavior, tests, and current APIs where possible.

Definition of done:

- Refactor the hard-limit violations first.
- Keep each touched file under the 300-line hard limit and improve margin under the 200-line soft target.
- Prefer extracting focused helpers/modules over moving complexity sideways into equally large sibling files.
- Run relevant tests for touched areas after each split.
- Re-run `pnpm run audit` and improve percentage of files under 200 lines beyond the current baseline.

Critical hard-limit violations:

- `src/reading_plan/planning/solve.py` (394)
- `electron/renderer/app/today/today_carousel_render.ts` (379)
- `electron/renderer/app/today/today_carousel_model.ts` (327)
- `mobile/src/features/today/today_background_theme.ts` (313)

Additional large files to include in the same cleanup track:

- `packages/contracts/src/types_subfolders/types_app.ts` (509)
- `packages/contracts/src/types_subfolders/types_books.ts` (293)
- `src/reading_plan/planning/model.py` (264)
- `mobile/src/features/today/use_today_data.ts` (260)
- `mobile/src/features/today/today_screen_view.tsx` (252)
- `src/reading_plan/http_api.py` (246)
- `electron/main/bridge/runner.ts` (241)
- `mobile/src/features/today/today_background_simulation.ts` (240)
- `electron/renderer/app/calendar_interactions/calendar_interactions_schedule_updates.ts` (230)
- `tests/test_mip.py` (220)
- `packages/contracts/src/types_subfolders/types_calendar.ts` (217)
- `mobile/src/navigation/mobile_navigation.tsx` (213)

Context:

- `STYLEGUIDE.md`
- `src/reading_plan/`
- `electron/renderer/app/today/`
- `electron/main/bridge/runner.ts`
- `mobile/src/features/today/`
- `packages/contracts/src/types_subfolders/`
