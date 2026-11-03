# ISSUE-029: Define event schema for sessions/completions/replans and metric derivation contract

**Type:** tech-debt
**Priority:** P1
**Labels:** `tech-debt`, `ml`, `privacy`, `desktop`, `testing`

Problem:

The app lacks a versioned, explicit domain-event contract for deriving adherence and plan-realism metrics from local behavior data. The existing SQLite recovery journal stores saved snapshots; it is not a session/completion/replan event stream.

Expected:

A stable, local event schema and derivation spec exists for session starts/completions, replans, and schedule edits.

Definition of done:

- Define event payloads, required fields, timestamps, and identifiers for core planner/user actions.
- Define deterministic derivation rules for roadmap metrics.
- Add schema validation tests and fixtures covering normal and malformed events.
- Document privacy boundaries for retained vs discardable fields.

Context:

- `packages/frontend/src/renderer/app/persistence.ts`
- `packages/frontend/src/renderer/app/load_state.ts`
- `apps/bartleby/src-tauri/src/state_store/`
- `ROADMAP.md`
