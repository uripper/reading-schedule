# Bartleby Roadmap (Audit-Based)

Last updated: February 20, 2026

## Codebase Baseline

- Product shape: Electron desktop app in `electron/` backed by Python planner engine in `src/reading_plan/`.
- Planner capability: MIP (CP-SAT) with greedy fallback, blocker dependencies, deadlines, day budgets, and schedule summaries.
- Verified quality gates (February 20, 2026):
  - `.venv/bin/pytest -q` -> `21 passed`
  - `node --test electron/tests/*.mjs` -> `12 passed`
  - `npm run typecheck:desktop` -> pass
  - `npm run lint:desktop` -> pass
  - `npm run build:desktop` -> pass

## Audit Findings To Address

1. Onboarding path is brittle: `data/books.csv` is referenced by CLI and GUI sample mode but does not exist in repo.
2. No local-first CI workflow (hook + one-command runner) to enforce checks before pushes/merges.
3. ESLint currently covers only `electron/scripts/**/*.mjs`; renderer/main TypeScript is not linted.
4. Planner generation always forces `start_date` to tomorrow in renderer flow (`electron/renderer/app/plan.ts`), not user-selectable.
5. MIP fallback behavior is opaque in UI when OR-Tools is unavailable.
6. Experience settings contain placeholders (`socialEnabled`, `recommendationsEnabled`, reminder settings) without shipped features.
7. Session logging subsystem exists in code but is not surfaced in the current UI.
8. State persistence has no schema versioning or migration strategy.

## 2026 Delivery Plan With Deadlines

### Features and bugs

- [ ] Make the ability to block books from being scheduled on certain days. I.e. if a user deletes a book from the schedule on a given day, that book should not be scheduled again on that day in the future.
- [ ] Add a "planner status" section to the UI that shows the current planner mode (MIP or greedy), any fallback events, and the last planner note/objective.
- [ ] Add the ability for users to to adjust minutes planned for book that day (for example, if they read more or less than planned) and have that update the schedule and stats accordingly.
- [ ] Fix daily goal progress bar to actually show how many minutes have been completed rather than remaining gray all the time.
- [ ] Fix how buggy today is currently. Right now, today is not considered for the schedule, as it completely breaks days after it when a book is marked as "completed". It still assumes a sort of ghost session between today and tomorrow and affects the schedule. All fixes have caused the next dy to either show a gap between where the book is at (i.e. shows that it begins further ahead in the book than it actually is) or causes the schedule to think a book is completed earlier than it is (i.e. a book will be marked as completed while showing that it is projected to end the day at 89% or something similar). The schedule should be able to handle today being marked as completed without breaking the schedule for the next day or showing inaccurate projections.
- [ ] Show how many pages and percentage a book should be at after the planned session today.
- [ ] Have a highlight around today in the calendar so it's easier to immediately click on. A Today button may be nice as well
- [ ] When adding a book, The After Book section messes with the UI pretty significantly. It pushes all the other fields down, instead of just being a dropdown that appears above the other elements.


### Milestone 1: Onboarding and Data Contracts

Deadline: March 20, 2026

- [ ] Add committed sample dataset (`data/books.sample.csv`) and wire CLI/GUI defaults to it.
- [ ] Add first-run fallback behavior when sample data is unavailable.
- [ ] Update README commands so fresh-clone setup is guaranteed to work.
- [ ] Add regression tests for CLI sample/default paths.

Exit criteria:

- Fresh clone can run desktop app and CLI without missing-file errors.
- `python -m reading_plan.gui_api --sample` succeeds with default args.

### Milestone 2: Local-First Quality Gates

Deadline: April 10, 2026

- [ ] Add a single local CI command (for example `npm run ci:local`) that runs Python tests, Electron typecheck, lint, build, and desktop tests.
- [ ] Add local automation hooks (`pre-push` or equivalent) to run the local CI command before push.
- [ ] Add a dedicated desktop test script in package scripts and include it in `ci:local`.
- [ ] Extend lint coverage to Electron TypeScript sources (main + renderer), or adopt an equivalent enforced checker in `ci:local`.

Exit criteria:

- One local command enforces the same checks currently documented in `STYLEGUIDE.md`.
- Pushes are blocked locally when required checks fail.

### Milestone 3: Planner Transparency and Control

Deadline: May 1, 2026

- [ ] Add planner mode control in settings (`mip`, `greedy`, `auto`).
- [ ] Surface planner metadata in UI/logs (actual planner used, status, note, objective).
- [ ] Add user-configurable plan start policy (today/tomorrow/custom) instead of hardcoding tomorrow.

Exit criteria:

- Users can intentionally choose planner behavior.
- Fallback to greedy is explicitly visible and test-covered.

### Milestone 4: State Portability and Versioning

Deadline: May 29, 2026

- [ ] Add JSON export/import for full app state.
- [ ] Add `state_version` to persisted snapshots.
- [ ] Implement migration path for older snapshots.
- [ ] Add tests for load/save/migration compatibility.

Exit criteria:

- Users can back up and restore state safely across app updates.
- Backward compatibility for at least one previous state version is verified.

### Milestone 5: Reading Activity Integration

Deadline: June 26, 2026

- [ ] Either integrate existing session logging UI into product navigation or remove dead session UI code paths.
- [ ] Ensure schedule completions and session logs produce consistent stats.
- [ ] Add tests for session-driven minute totals and streak calculations through UI flows.

Exit criteria:

- Activity tracking has one clear, supported workflow (not partial/invisible subsystems).
- Stats remain consistent between planned completions and logged sessions.

### Milestone 6: Experience Settings Completion

Deadline: July 31, 2026

- [ ] Ship reminder behavior or remove reminder toggles from settings until implemented.
- [ ] Ship first recommendations feature slice or remove recommendation flag from UI.
- [ ] Ship first social feature slice or remove social flag from UI.

Exit criteria:

- Every setting exposed in the UI has working behavior and tests.
- No placeholder toggles remain in production-facing settings.

## Backlog (Post-July 2026, No Date Yet)

- Multi-device sync.
- Public API integrations beyond Open Library metadata lookup.
- Mobile clients.
- Localization and multi-language UX.
