# ISSUE-029: Define event schema for sessions/completions/replans and metric derivation contract


**Type:** tech-debt
**Priority:** P1
**Labels:** `tech-debt`, `ml`, `privacy`, `desktop`, `testing`

Problem:

The app lacks a versioned, explicit event contract for deriving adherence and plan-realism metrics from local behavior data.

Expected:

A stable, local event schema and derivation spec exists for session starts/completions, replans, and schedule edits.

Definition of done:

- Define event payloads, required fields, timestamps, and identifiers for core planner/user actions.
- Define deterministic derivation rules for roadmap metrics.
- Add schema validation tests and fixtures covering normal and malformed events.
- Document privacy boundaries for retained vs discardable fields.

Context:

- `electron/renderer/app/persistence.ts`
- `electron/renderer/app/load_state.ts`
- `electron/state_store.ts`
- `ROADMAP.md`

