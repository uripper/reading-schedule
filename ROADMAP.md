# Bartleby Roadmap (Audit-Based)

Last updated: February 27, 2026

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

- [ ] Ship full-state JSON export/import as the first portability slice (see `ISSUE-059`).
- [ ] Define and implement persistence backend migration plan from JSON to database, starting with local-first SQLite baseline (see `ISSUE-060`).
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
- [ ] Fix recommendations quality and card formatting, including non-book filtering and duplicate prevention (see `ISSUE-052`).
- [ ] Ship first social feature slice or remove social flag from UI.

Exit criteria:

- Every setting exposed in the UI has working behavior and tests.
- No placeholder toggles remain in production-facing settings.

### Milestone 7: Measurement, Privacy, and Calm Personalization Foundations

Deadline: August 28, 2026

- [ ] Define a stable local event schema for session starts/completions, replans, and manual schedule edits.
- [ ] Add metric derivation rules for adherence and realism outcomes in planner telemetry summaries.
- [ ] Add local-only privacy controls for export/delete of behavior history and per-feature consent gates for connectors.
- [ ] Add reminder guardrail controls (opt-in, cadence, quiet hours, one-click disable) in settings and persistence.
- [ ] Add adaptive WPM calibration v1 (EWMA + clamp ranges + confidence gating) without shipping advanced experimentation loops.

Exit criteria:

- Outcome metrics can be computed from local state without external services.
- Reminder behavior is user-controlled and can be disabled immediately.
- Personalization behavior is bounded, explainable, and migration-safe.

## Outcome Metrics and Guardrails

Metrics tracked for every milestone change:

- `session_start_rate`: higher is better; percent of days with at least one started session.
- `planned_session_completion_rate`: higher is better; percent of planned sessions completed.
- `plan_realism_error_minutes`: lower is better; absolute difference between planned and actual minutes.
- `weekly_active_days`: higher is better; active reading days in a rolling 7-day window.
- `replan_recovery_rate`: higher is better; percent of missed-plan days that recover within 48 hours.
- `schedule_churn_rate`: lower is better; percent of upcoming rows changed by each replan.
- `reminder_opt_out_rate`: lower is better once reminders are enabled; monitor for reminder overload.
- `auto_plan_disable_rate`: lower is better; indicates plan trust and usability.

Guardrails:

- Reminders are opt-in only.
- Reminder cadence and quiet hours are user-configurable.
- Reminder delivery can be disabled with a one-click control.
- No forced interruption flows or non-dismissible reminder loops.

## Data and Privacy Posture

- Product mode is local-by-default: planning, personalization, and telemetry storage remain on-device.
- Data minimization applies to new features: collect only fields needed for scheduling and user-visible insights.
- Any connector/sync path must use explicit user consent before first data transfer.
- Export and deletion expectations are mandatory: users can export state and remove stored activity/personalization data.
- Advanced ML features remain blocked until telemetry quality and guardrails are validated locally.

## Backlog (Post-August 2026, No Date Yet)

Foundation expansion (after Milestone 7):

- Multi-device sync.
- Public API integrations beyond Open Library metadata lookup.
- Mobile clients.
- Localization and multi-language UX.

Advanced experimentation (only after telemetry + guardrails readiness):

- Adherence classifier for pre-plan stress testing.
- Contextual bandit reminder optimization.
