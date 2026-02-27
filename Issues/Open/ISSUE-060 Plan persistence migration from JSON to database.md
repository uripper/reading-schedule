# ISSUE-060: Plan persistence migration from JSON to database

**Type:** tech-debt
**Priority:** P1
**Labels:** `tech-debt`, `desktop`, `persistence`, `architecture`

Problem:

Current desktop persistence relies on a single JSON snapshot file. This limits
queryability, makes partial updates expensive, and constrains future sync and
analytics features.

Expected:

Define and execute a migration strategy from JSON snapshots to a database-backed
persistence layer while preserving local-first behavior and migration safety.

Strategy comparison (required in implementation proposal):

1. Local-first SQLite baseline (recommended).
2. Local-first database with additional cache/index layer for hot-path reads.
3. Sync-service architecture with relational primary store and Redis cache tier.

Definition of done:

- Deliver an architecture decision record comparing the three strategies above.
- Implement the selected first-phase persistence backend (default: SQLite).
- Keep a compatibility import path from existing JSON snapshots.
- Add schema versioning/migration tests for at least one prior snapshot version.
- Document operational constraints, rollback plan, and data integrity checks.

Context:

- `electron/main/state_store.ts`
- `electron/renderer/app/persistence.ts`
- `electron/renderer/app/load_state.ts`
- `ROADMAP.md`
