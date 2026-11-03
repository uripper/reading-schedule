# ISSUE-031: Version personalization parameters with state snapshot migrations

**Type:** tech-debt
**Priority:** P1
**Labels:** `tech-debt`, `ml`, `desktop`, `testing`

Problem:

Core snapshots already have a state version and native migration mechanism. Future personalization parameters have no persisted schema or migration steps yet; extend the existing mechanism rather than creating a second migration framework.

Expected:

Personalization parameters are versioned and migrated with the same reliability guarantees as core app state.

Definition of done:

- Extend snapshot schema to include versioned personalization fields.
- Add migration steps for older snapshots with no personalization payload.
- Add tests for forward/backward load behavior and migration failures.
- Document migration invariants and rollback behavior.

Context:

- `apps/bartleby/src-tauri/src/state_store/migrations.rs`
- `packages/contracts/src/`
- `packages/frontend/src/renderer/app/load_state.ts`
- `packages/frontend/src/renderer/app/persistence.ts`
- `apps/bartleby/src-tauri/src/state_store_tests.rs`
