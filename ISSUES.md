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
| ISSUE-019 | Add formats and ownership to book metadata | enhancement | P3 |
| ISSUE-020 | Implement session-level notes, reflections, highlights, and tagging | enhancement | P3 |
| ISSUE-021 | Candidate: Synchronization with external reading trackers (Goodreads, StoryGraph, etc...) | enhancement | P3 |
| ISSUE-022 | Candidate: Synchronization with e-reader devices (Kindle, Kobo, etc...) | enhancement | P3 |
| ISSUE-023 | Candidate: Synchronization with note-taking tools (Obsidian, Notion, etc...) | enhancement | P3 |
| ISSUE-024 | Candidate: Synchronization with calendar apps (Google Calendar, Apple Calendar, etc...) | enhancement | P3 |
| ISSUE-025 | Candidate: Synchronization with audiobook platforms (Audible, Libby, etc...) | enhancement | P3 |
| ISSUE-026 | Add support for non-book reading materials (articles, papers, etc...) | enhancement | P3 |

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

## ISSUE-019: Add formats and ownership to book metadata

**Type:** enhancement
**Priority:** P3
**Labels:** `enhancement`, `planner`, `desktop`

Problem:

Current book metadata focuses on title/author/pages; formats (ebook, audiobook, physical) and ownership status are not tracked. Ownership could include `owned`, `borrowed`, `wishlist`, etc...

Expected:

Book metadata includes format and ownership fields, which can inform scheduling and progress tracking.

Definition of done:

- Extend book schema to include `format` and `ownership_status`.
- Update book loading and persistence logic.
- Add UI elements to display and edit these fields in book details.
- Add tests for new metadata fields and their impact on scheduling logic.

## ISSUE-020: Implement session-level notes, reflections, highlights, and tagging

**Type:** enhancement
**Priority:** P3
**Labels:** `enhancement`, `desktop`, `ux`

Problem:

Current session tracking is limited to minutes and pages; there is no built-in way for users to capture qualitative reflections, notes, highlights, or tags associated with a reading session.

Expected:

Users can add notes, reflections, highlights, and tags to each session, which are then viewable in session details and can be used for personal insights or exported (i.e. to Obsidian) for external use.

Definition of done:

- Extend session data model to include `notes`, `reflections`, `highlights`, and `tags`.
- Add UI components for users to input and view this information in session details.
- Ensure that this additional data is persisted and can be exported in session logs.
- Add tests for session data model extensions and UI interactions.

## ISSUE-021: Candidate feature - Synchronization with external reading trackers (Goodreads, StoryGraph, etc...)

**Type:** enhancement
**Priority:** P3
**Labels:** `enhancement`, `desktop`, `planner`

Problem:

Many users already track their reading progress, book lists, and notes in external services like Goodreads or StoryGraph. Integrating with these platforms would allow users to synchronize their data across tools and avoid manual duplication of effort.

Expected:

Users can connect their Bartleby account with external reading trackers to synchronize their book lists, reading progress, and notes. This could include:

- Importing book lists and metadata from external services.
- Syncing reading progress and session notes back to those platforms.
- Providing a clear UI for managing these integrations and synchronization settings.
- Ensuring that synchronization is secure and respects user privacy.
- Handling edge cases like conflicts, rate limits, and API changes gracefully.
- Adding tests for integration functionality and error scenarios.

Definition of done:

- Research and define integration points with at least one external reading tracker (e.g., Goodreads).
- Implement synchronization logic for book lists and reading progress.
- Add UI components for managing the integration and displaying synchronized data.
- Ensure that synchronization is robust and handles edge cases (e.g., connectivity issues, data conflicts
- Add tests for external tracker synchronization functionality and error handling.

## ISSUE-022: Synchronization with e-reader devices (Kindle, Kobo, etc...)

**Type:** enhancement
**Priority:** P3
**Labels:** `enhancement`, `desktop`, `planner`

Problem:

Many users read on e-reader devices like Kindle or Kobo and would benefit from having their reading progress automatically synchronized with Bartleby to keep their schedule and stats up to date without manual input.

Expected:

Users can connect their e-reader device to Bartleby, allowing for automatic synchronization of reading progress. This could be achieved through:

- Direct integration with e-reader APIs (if available).
- Syncing through a companion app that reads progress from the device and updates Bartleby.
- Providing a clear UI for managing the e-reader connection and synchronization settings.
- Ensuring that synchronization is secure and respects user privacy.

Definition of done:

- Research and define the best approach for e-reader synchronization.
- Implement synchronization logic for at least one e-reader platform (e.g., Kindle).
- Add UI components for managing the e-reader connection and displaying synchronized progress.
- Ensure that synchronization is robust and handles edge cases (e.g., connectivity issues, data conflicts).
- Add tests for e-reader synchronization functionality and error handling.

## ISSUE-023 Synchronization with note-taking tools (Obsidian, Notion, etc...)

**Type:** enhancement
**Priority:** P3
**Labels:** `enhancement`, `desktop`, `ux`

Problem:

Users often take notes, highlight passages, and reflect on their reading sessions. Integrating with popular note-taking tools like Obsidian or Notion would allow users to seamlessly export their session notes, reflections, and highlights for further organization and review.

Expected:

Users can connect their Bartleby account with note-taking tools to export session data. This could include:

- Exporting session notes, reflections, highlights, and tags to Obsidian or Notion.
- Providing options for export format (e.g., markdown, plain text) and organization (e.g., by book, by date).
- Ensuring that the export process is user-friendly and can be triggered manually or set to auto-export after each session.
- Adding UI components for managing note-taking tool integrations and export settings.
- Ensuring that data export respects user privacy and security.

Definition of done:

- Define data mapping and export format for note-taking tools.
- Implement export functionality for at least one note-taking tool (e.g., Obsidian).
- Add UI components for managing the integration and export settings.
- Ensure that the export process is robust and handles edge cases (e.g., authentication issues, export failures).
- Add tests for note-taking tool export functionality and error handling.

## ISSUE-024: Synchronization with calendar apps (Google Calendar, Apple Calendar, etc...)

**Type:** enhancement
**Priority:** P3
**Labels:** `enhancement`, `desktop`, `planner`

Problem:

Users often schedule their reading sessions in calendar apps like Google Calendar or Apple Calendar. Integrating Bartleby with these calendar apps would allow users to have their reading schedule automatically reflected in their calendar, providing better visibility and reminders.

Expected:

Users can connect their Bartleby account with calendar apps to synchronize their reading schedule. This could include:

- Syncing scheduled reading sessions from Bartleby to calendar apps as events.
- Providing options for event details (e.g., title, description, reminders).
- Ensuring that synchronization is secure and respects user privacy.
- Adding UI components for managing calendar integrations and synchronization settings.
- Ensuring that synchronization is robust and handles edge cases (e.g., connectivity issues, data
conflicts).

Definition of done:

- Define integration points and data mapping for calendar apps.
- Implement synchronization logic for at least one calendar platform (e.g., Google Calendar).
- Add UI components for managing the calendar integration and displaying synchronized events.
- Ensure that synchronization is robust and handles edge cases (e.g., connectivity issues, data conflicts).
- Add tests for calendar synchronization functionality and error handling.

## ISSUE-025: Synchronization with audiobook platforms (Audible, Libby, etc...)

**Type:** enhancement
**Priority:** P3
**Labels:** `enhancement`, `desktop`, `planner`

Problem:

Many users listen to audiobooks on platforms like Audible or Libby and would benefit from having their listening progress automatically synchronized with Bartleby to keep their schedule and stats up to date without manual input.

Expected:

Users can connect their audiobook platform account to Bartleby, allowing for automatic synchronization of listening progress. This could be achieved through:

- Direct integration with audiobook platform APIs (if available).
- Syncing through a companion app that reads progress from the platform and updates Bartleby.
- Providing a clear UI for managing the audiobook platform connection and synchronization settings.
- Ensuring that synchronization is secure and respects user privacy.

Definition of done:

- Research and define the best approach for audiobook platform synchronization.
- Implement synchronization logic for at least one audiobook platform (e.g., Audible).
- Add UI components for managing the audiobook platform connection and displaying synchronized progress.
- Ensure that synchronization is robust and handles edge cases (e.g., connectivity issues, data conflicts).
- Add tests for audiobook platform synchronization functionality and error handling.

## ISSUE-026: Add support for non-book reading materials (articles, papers, etc...)

**Type:** enhancement
**Priority:** P3
**Labels:** `enhancement`, `desktop`, `planner`

Problem:

Bartleby currently focuses on books as the primary reading material, but many users also read articles, papers, essays, and other non-book formats that they may want to track and schedule.

Expected:

Users can add and track non-book reading materials with appropriate metadata (e.g., source, publication date) and have them integrated into the scheduling and progress tracking features.

Definition of done:

- Extend the book schema to accommodate non-book materials with relevant metadata fields.
- Update the UI to allow users to specify the type of reading material and input relevant metadata.
- Ensure that non-book materials are included in scheduling logic and progress tracking.
- Add tests for handling non-book reading materials in the system.
