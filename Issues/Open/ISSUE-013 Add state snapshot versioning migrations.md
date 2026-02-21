# ISSUE-013: Add state snapshot versioning + migrations


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

