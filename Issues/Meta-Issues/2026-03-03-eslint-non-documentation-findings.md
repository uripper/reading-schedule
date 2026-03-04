# ESLint Non-Documentation Findings (2026-03-03)

Scope: findings observed while addressing documentation-only work.

## Summary

- Non-doc findings remain in both `electron/` and `mobile/`.
- Dominant issue class: `Prefer for...of instead of forEach.`
- Additional issue classes:
  - `Don't use console.`
  - Function complexity/length limits.

## Findings By File

- `mobile/src/features/today/today_theme_transition_layer.tsx`
  - Function has too many lines (73 > 50).

- `mobile/src/features/today/today_background.tsx`
  - Excessive complexity in `simulate` (24 > 15).
  - Function has too many lines (139 > 50).
  - Function has too many lines (89 > 50).

- `mobile/src/navigation/mobile_navigation.tsx`
  - `rootStacks` function has too many lines (57 > 50).
  - `MobileNavigation` function has too many lines (62 > 50).

- `electron/main/book_lookup/search_author_scoring.ts`
  - Prefer `for...of` instead of `forEach`.

- `electron/main/book_lookup/search_dedupe.ts`
  - Prefer `for...of` instead of `forEach`.

- `electron/main/book_lookup/search_scoring.ts`
  - Prefer `for...of` instead of `forEach`.

- `electron/main/book_lookup/search.ts`
  - Prefer `for...of` instead of `forEach` (multiple occurrences).

- `electron/renderer/calendar.ts`
  - Prefer `for...of` instead of `forEach`.

- `electron/renderer/logger.ts`
  - `Don't use console.` (multiple occurrences).

- `electron/renderer/activity/day_minutes.ts`
  - Prefer `for...of` instead of `forEach` (multiple occurrences).

- `electron/renderer/app/calendar_interactions/calendar_interactions_manual_helpers.ts`
  - Prefer `for...of` instead of `forEach`.

- `electron/renderer/app/calendar_interactions/calendar_interactions_row_helpers.ts`
  - Prefer `for...of` instead of `forEach`.

- `electron/renderer/app/experience/bindings.ts`
  - Prefer `for...of` instead of `forEach` (multiple occurrences).

- `electron/renderer/app/load_state_compat.ts`
  - Prefer `for...of` instead of `forEach`.

- `electron/renderer/app/runtime_helpers.ts`
  - Prefer `for...of` instead of `forEach`.

- `electron/renderer/app/schedule_preserve.ts`
  - Prefer `for...of` instead of `forEach` (multiple occurrences).

- `electron/renderer/app/state_indexes.ts`
  - Prefer `for...of` instead of `forEach` (multiple occurrences).

- `electron/renderer/app/today/today_books_view.ts`
  - Prefer `for...of` instead of `forEach`.

- `electron/renderer/app/today/today_schedule.ts`
  - Prefer `for...of` instead of `forEach` (multiple occurrences).

- `electron/renderer/books/card_events.ts`
  - Prefer `for...of` instead of `forEach` (multiple occurrences).

- `electron/renderer/books/card_nodes.ts`
  - Prefer `for...of` instead of `forEach`.

- `electron/renderer/books/estimated_finish_groups.ts`
  - Prefer `for...of` instead of `forEach`.

- `electron/renderer/books/finish_dates.ts`
  - Prefer `for...of` instead of `forEach` (multiple occurrences).

- `electron/renderer/books/form_scheduled_days.ts`
  - Prefer `for...of` instead of `forEach`.

- `electron/renderer/books/grouping.ts`
  - Prefer `for...of` instead of `forEach`.

- `electron/renderer/books/model_payload.ts`
  - Prefer `for...of` instead of `forEach`.

## Notes

- This list captures non-documentation findings only.
- Documentation linting changes were handled separately in this pass.
