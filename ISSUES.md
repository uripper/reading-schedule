# Bartleby Issues

Last updated: February 21, 2026

This file is a local issue tracker extracted from `ROADMAP.md` and organized for implementation handoff.

## Labels (Minimal Set)

- `bug`
- `enhancement`
- `tech-debt`
- `ux`
- `planner`
- `desktop`
- `devex`
- `testing`

## Priority Scale

- `P0`: blocking / correctness bug
- `P1`: high-value near-term work
- `P2`: useful but not urgent
- `P3`: future candidate

## Issue Index

| ID | Title | Type | Priority |
| --- | --- | --- | --- |
| ISSUE-001 | Missing sample books file breaks sample mode | bug | P0 |
| ISSUE-002 | Keep manually removed day-book pairs blocked from replan | enhancement | P1 |
| ISSUE-003 | Add planner status panel in UI | enhancement | P1 |
| ISSUE-004 | Let users edit planned minutes for a scheduled row | enhancement | P1 |
| ISSUE-005 | Daily goal progress bar does not visibly reflect completion | bug | P1 |
| ISSUE-006 | "Today completion" causes projection/continuity errors | bug | P0 |
| ISSUE-007 | Show expected pages/% after today's planned session | enhancement | P2 |
| ISSUE-008 | Improve calendar "today" discoverability | enhancement | P2 |
| ISSUE-009 | "After Book" picker shifts dialog layout | bug | P2 |
| ISSUE-010 | Add local-first CI command + pre-push enforcement | tech-debt | P1 |
| ISSUE-011 | Expand lint coverage to Electron TypeScript | tech-debt | P1 |
| ISSUE-012 | Make plan start-date policy user-configurable | enhancement | P1 |
| ISSUE-013 | Add state snapshot versioning + migrations | tech-debt | P1 |
| ISSUE-014 | Integrate or remove orphaned session logging flow | enhancement | P2 |
| ISSUE-015 | Ship-or-hide placeholder Experience toggles | tech-debt | P2 |
| ISSUE-016 | Candidate: multi-device sync | enhancement | P3 |
| ISSUE-017 | Candidate: localization and i18n | enhancement | P3 |
| ISSUE-018 | Candidate: richer metadata integrations | enhancement | P3 |

---

## ISSUE-001: Missing sample books file breaks sample mode

**Type:** bug  
**Priority:** P0  
**Labels:** `bug`, `planner`, `desktop`

Problem:

Default sample-mode commands reference `data/books.csv`, but that file is missing in the repository.

Repro:

1. Run `.venv/bin/python -m reading_plan.gui_api --sample --data data/books.csv --settings data/settings.json`.
2. Observe `{"ok": false, "error": "[Errno 2] No such file or directory: 'data/books.csv'"}`.

Expected:

Sample mode should work on a fresh clone without manual file creation.

Definition of done:

- Add committed sample data file (recommended `data/books.sample.csv`).
- Update defaults in CLI/GUI bridge and docs.
- Add tests for default/sample load path.

Context:

- `src/reading_plan/gui_api.py`
- `src/reading_plan/cli.py`
- `README.md`

## ISSUE-002: Keep manually removed day-book pairs blocked from replan

**Type:** enhancement  
**Priority:** P1  
**Labels:** `enhancement`, `planner`, `desktop`

Problem:

If a user removes a scheduled row for a specific day/book, replanning can add the same book back on that same day.

Expected:

Manual removal should optionally behave as a "do not schedule this book on this day" constraint for future replans.

Definition of done:

- Persist user day-book block constraints in app state.
- Apply constraints during schedule merge/replan flow.
- Add regression tests for remove-and-replan behavior.

Open design question:

- Should the block be permanent until removed, or only for the next replan?

Context:

- `electron/renderer/app/calendar_interactions.ts`
- `electron/renderer/app/schedule_preserve.ts`
- `electron/renderer/calendar/details_session_items.ts`

## ISSUE-003: Add planner status panel in UI

**Type:** enhancement  
**Priority:** P1  
**Labels:** `enhancement`, `desktop`, `planner`

Problem:

Users do not have a clear persistent view of planner mode, fallback events, solver status, objective, and notes.

Expected:

A visible planner status area should show:

- planner requested vs planner actually used
- solver status
- note/fallback reason
- objective value (when available)

Definition of done:

- Add planner status component to the UI.
- Populate from `summary` and `result` metadata.
- Add renderer tests for display logic.

Context:

- `electron/renderer/app/plan.ts`
- `electron/renderer/app/plan_controller.ts`
- `electron/renderer/app/types.ts`
- `src/reading_plan/solve.py`

## ISSUE-004: Let users edit planned minutes for a scheduled row

**Type:** enhancement  
**Priority:** P1  
**Labels:** `enhancement`, `desktop`, `planner`

Problem:

There is no direct way to adjust planned minutes for an existing day/book row and have downstream totals/projections update.

Expected:

User can edit row minutes from day details and the app recalculates schedule-derived stats/progress consistently.

Definition of done:

- Add editable minutes input for planned rows.
- Recompute row words/projections and persist changes.
- Keep stats/today views in sync after edits.
- Add tests for update behavior.

Context:

- `electron/renderer/calendar/details_progress_form.ts`
- `electron/renderer/app/calendar_interactions.ts`
- `electron/renderer/stats/model.ts`
- `electron/renderer/app/today.ts`

## ISSUE-005: Daily goal progress bar does not visibly reflect completion

**Type:** bug  
**Priority:** P1  
**Labels:** `bug`, `desktop`, `ux`

Problem:

The daily goal can remain visually "gray"/not clearly progressing despite completed minutes.

Expected:

Progress styling should visibly track `todayMinutes / goalMinutes` and match textual value.

Definition of done:

- Fix progress bar rendering logic and/or CSS implementation.
- Verify with manual completion and session logs.
- Add regression test for percentage updates.

Context:

- `electron/renderer/app/today.ts`
- `electron/styles/base.css`
- `electron/index.html`

## ISSUE-006: "Today completion" causes projection/continuity errors

**Type:** bug  
**Priority:** P0  
**Labels:** `bug`, `planner`, `desktop`

Problem:

Marking today's session as complete can create "ghost" continuity issues in subsequent days (gaps, over-advanced start points, or early completion).

Expected:

Completing today should not break tomorrow onward; projected pages/% and completion logic should remain consistent.

Definition of done:

- Reproduce and codify failing scenarios in tests.
- Fix completion/projection calculations across today/tomorrow boundary.
- Ensure no false "book finished" state while projected % is incomplete.

Context:

- `electron/renderer/calendar/estimates.ts`
- `electron/renderer/app/calendar_interactions_helpers.ts`
- `electron/renderer/app/schedule_preserve.ts`
- `electron/tests/calendar-estimates.test.mjs`
- `electron/tests/today-schedule.test.mjs`

## ISSUE-007: Show expected pages/% after today's planned session

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

## ISSUE-008: Improve calendar "today" discoverability

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

## ISSUE-009: "After Book" picker shifts dialog layout

**Type:** bug  
**Priority:** P2  
**Labels:** `bug`, `desktop`, `ux`

Problem:

The "After Book" picker expands in a way that pushes form layout unexpectedly.

Expected:

Results should behave like an overlay dropdown and not reflow unrelated form controls.

Definition of done:

- Convert picker results to overlay behavior.
- Stabilize dialog layout while searching/selecting.
- Add regression coverage for picker open/close interactions.

Context:

- `electron/renderer/books/after_book_picker.ts`
- `electron/renderer/books/after_book_picker_helpers.ts`
- `electron/styles/book-dialog.css`
- `electron/index.html`

## ISSUE-010: Add local-first CI command + pre-push enforcement

**Type:** tech-debt  
**Priority:** P1  
**Labels:** `tech-debt`, `devex`, `testing`

Problem:

Quality checks are run manually and are easy to skip by accident.

Expected:

One local command runs required checks, and pre-push enforces it by default.

Definition of done:

- Add `ci:local` script with required commands.
- Add hook setup and documented install step.
- Ensure fast failure and clear output.

Context:

- `package.json`
- `STYLEGUIDE.md`

## ISSUE-011: Expand lint coverage to Electron TypeScript

**Type:** tech-debt  
**Priority:** P1  
**Labels:** `tech-debt`, `devex`, `desktop`

Problem:

Current lint command checks only `electron/scripts/**/*.mjs`; main/renderer TS gaps remain.

Expected:

Lint/static analysis for Electron TS should be part of normal local validation.

Definition of done:

- Add lint strategy for main + renderer TS files.
- Integrate into `ci:local`.
- Update docs with exact command contract.

Context:

- `electron/eslint.config.mjs`
- `electron/package.json`
- `electron/tsconfig.main.json`
- `electron/tsconfig.renderer.json`

## ISSUE-012: Make plan start-date policy user-configurable

**Type:** enhancement  
**Priority:** P1  
**Labels:** `enhancement`, `planner`, `desktop`

Problem:

Planner payload currently forces `start_date` to tomorrow, even when users may want today/custom.

Expected:

User can choose start policy (`today`, `tomorrow`, `custom`) in settings.

Definition of done:

- Add setting and serialization.
- Remove hardcoded forced-tomorrow behavior.
- Add tests for each policy path.

Context:

- `electron/renderer/app/plan.ts`
- `electron/renderer/settings/config.ts`
- `electron/renderer/settings.ts`

## ISSUE-013: Add state snapshot versioning + migrations

**Type:** tech-debt  
**Priority:** P1  
**Labels:** `tech-debt`, `desktop`, `testing`

Problem:

Persisted state has no explicit schema version and no migration layer.

Expected:

Saved state should include `state_version` and load through a migration pipeline.

Definition of done:

- Versioned state schema with migration function(s).
- Backward-compatible load for at least one previous version.
- Tests for migration success/failure behavior.

Context:

- `electron/state_store.ts`
- `electron/renderer/app/load_state.ts`
- `electron/renderer/app/persistence.ts`

## ISSUE-014: Integrate or remove orphaned session logging flow

**Type:** enhancement  
**Priority:** P2  
**Labels:** `enhancement`, `desktop`, `ux`

Problem:

Session logging subsystem exists but is not fully integrated into visible app workflow.

Expected:

Either expose session tracking clearly in UI navigation or remove unused paths.

Definition of done:

- Choose direction (integrate vs remove).
- Align stats/today behavior with chosen direction.
- Remove dead code if not integrated.

Context:

- `electron/renderer/sessions.ts`
- `electron/renderer/app.ts`
- `electron/renderer/stats/model.ts`

## ISSUE-015: Ship-or-hide placeholder Experience toggles

**Type:** tech-debt  
**Priority:** P2  
**Labels:** `tech-debt`, `desktop`, `ux`

Problem:

Several toggles are exposed but not fully implemented (`social`, `recommendations`, reminder behavior).

Expected:

Each visible toggle has real behavior, or is hidden until implemented.

Definition of done:

- Audit each toggle in Experience section.
- Implement or hide with explicit roadmap decision.
- Add tests/documentation for shipped behaviors.

Context:

- `electron/renderer/app/experience.ts`
- `electron/renderer/app/experience_bindings.ts`
- `electron/index.html`

## ISSUE-016: Candidate feature - multi-device sync

**Type:** enhancement  
**Priority:** P3  
**Labels:** `enhancement`, `desktop`, `planner`

Problem:

State is local-only; no sync across devices.

Expected:

Opt-in sync model for books, settings, schedule completions, and sessions.

Definition of done:

- Draft architecture and conflict-resolution approach.
- Define security/privacy requirements before implementation.

## ISSUE-017: Candidate feature - localization and i18n

**Type:** enhancement  
**Priority:** P3  
**Labels:** `enhancement`, `desktop`, `ux`

Problem:

UI and messaging are single-language only.

Expected:

Core UI supports translation keys and locale formatting.

Definition of done:

- Choose i18n framework/pattern.
- Externalize user-visible strings.
- Ship at least one additional locale.

## ISSUE-018: Candidate feature - richer metadata integrations

**Type:** enhancement  
**Priority:** P3  
**Labels:** `enhancement`, `planner`, `desktop`

Problem:

Metadata ingestion is centered on Open Library only.

Expected:

Optional additional providers improve lookup coverage and metadata quality.

Definition of done:

- Define provider abstraction and fallback order.
- Add provider-specific tests and failure handling.
