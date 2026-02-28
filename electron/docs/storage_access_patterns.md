# Storage Access Patterns

## Current Hot Queries

- Sessions for a day
- Sessions for a book
- Book by id
- Completion checks by session key and day-book key

## Serving Strategy

- Interactive reads come from in-memory derived indexes:
  - `bookById`
  - `sessionsByDay`
  - `sessionsByBook`
  - completion partitions by session/day-book key
- Durable state persistence uses SQLite snapshot + journal.
- JSON primary/backup files remain as migration compatibility paths.

## Escalation Signals

- Add SQLite FTS5 when notes/highlights/tag text search becomes a core query.
- Move toward append-only event log + compaction if multi-device sync and conflict resolution become first-class requirements.
- Keep analytics views as derived read models so write latency is not coupled to aggregate reporting.
