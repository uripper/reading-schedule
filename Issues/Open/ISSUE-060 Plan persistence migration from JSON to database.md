# ISSUE-060: Plan persistence migration from JSON to database

**Type:** tech-debt
**Priority:** P1
**Labels:** `tech-debt`, `desktop`, `persistence`, `architecture`

Problem:

The native store uses SQLite as a container for whole-state JSON. Both
planner_state_snapshot and planner_state_journal store payload_json rather than
queryable domain records. Saves still serialize and replace the full state, with
an additional JSON compatibility write. This does not provide a maintainable
relational model, database-enforced domain integrity, or targeted record updates.

Expected:

Migrate the current snapshot-based storage to a real relational persistence model
using the existing local-first SQLite engine. Books, sessions, settings,
preferences, schedule rows/completions, blocked day/book pairs, and synced-source
links should have explicit schemas and relationships where appropriate. JSON
remains an interchange and recovery format rather than the primary domain model.

Implementation scope:

- Design typed tables, stable identifiers, foreign keys, constraints, and indexes
  around actual read/write needs. Distinguish recorded activity from generated
  schedule projections.
- Replace whole-snapshot rewrites with transactional domain operations and
  queries, including the renderer/host contracts needed for those operations.
- Compare schema and migration approaches within the existing SQLite runtime.
  Additional cache or sync-service tiers need a concrete requirement; they are
  not prerequisites for this local persistence improvement.

Definition of done:

- Persist and query domain records without unpacking an entire state JSON blob.
- Update one book or session transactionally without rewriting unrelated data.
- Migrate both existing SQLite JSON payloads and legacy JSON files without losing
  books, sessions, progress history, completions, settings, or source links.
- Version the database schema separately from export/snapshot formats where needed.
- Preserve export/import and actionable backup/recovery behavior.
- Test migration, relationships, invalid records, rollback, targeted updates,
  recovery, and representative query performance.
- Record schema decisions and operational constraints in the existing issue or
  relevant implementation guidance.

Context:

- `apps/bartleby/src-tauri/src/state_store/sqlite_store.rs`
- `apps/bartleby/src-tauri/src/state_store/migrations.rs`
- `apps/bartleby/src-tauri/src/state_store/sqlite_store_tests.rs`
- `apps/bartleby/src-tauri/src/state_store_tests.rs`
- `apps/bartleby/src-tauri/src/data_archive/`
- `packages/frontend/src/renderer/app/persistence.ts`
- `packages/frontend/src/renderer/app/persist-queue.ts`
- `packages/contracts/src/state.ts`

Audit disposition: keep open. The existing SQLite JSON wrapper does not satisfy
this migration's relational persistence goal.
