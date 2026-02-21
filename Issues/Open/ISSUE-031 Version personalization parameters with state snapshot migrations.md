# ISSUE-031: Version personalization parameters with state snapshot migrations


**Type:** tech-debt
**Priority:** P1
**Labels:** `tech-debt`, `ml`, `desktop`, `testing`

Problem:

Personalization parameters will become part of persisted state but currently have no versioning/migration strategy.

Expected:

Personalization parameters are versioned and migrated with the same reliability guarantees as core app state.

Definition of done:

- Extend snapshot schema to include versioned personalization fields.
- Add migration steps for older snapshots with no personalization payload.
- Add tests for forward/backward load behavior and migration failures.
- Document migration invariants and rollback behavior.

Context:

- `electron/state_store.ts`
- `electron/renderer/app/load_state.ts`
- `electron/renderer/app/persistence.ts`
- `ISSUES.md`

