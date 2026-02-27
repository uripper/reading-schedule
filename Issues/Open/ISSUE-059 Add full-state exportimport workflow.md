# ISSUE-059: Add full-state export/import workflow

**Type:** enhancement
**Priority:** P1
**Labels:** `enhancement`, `desktop`, `data-portability`

Problem:

Users cannot reliably back up and restore their complete local Bartleby data.
Without a first-class export/import path, upgrades and device transitions are
riskier than necessary.

Expected:

Users can export a full-state JSON snapshot and later import the same snapshot
to restore their library, plan, settings, sessions, and completion maps.

Definition of done:

- Add an export action that writes the full planner state snapshot as JSON.
- Add an import action that validates and loads a full planner state snapshot.
- Preserve compatibility with `state_version` migration handling.
- Show user-visible status messages for success and recoverable import failures.
- Add tests for successful round-trip export/import and invalid payload handling.
- Document the workflow and constraints in the README or user-facing help copy.

Context:

- `electron/main/state_store.ts`
- `electron/renderer/app/persistence.ts`
- `electron/renderer/app/load_state.ts`
- `electron/types/types_base.ts`
