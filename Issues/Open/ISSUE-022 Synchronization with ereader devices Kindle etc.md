# ISSUE-022: Synchronization with e-reader devices (Kindle, etc...)

**Type:** enhancement
**Priority:** P3
**Labels:** `enhancement`, `desktop`, `planner`

*Kobo complete.*

Problem:

Users reading on other e-reader devices still need supported integrations to
keep their reading progress, schedules, and statistics up to date.

Expected:

Support additional e-reader providers, such as Kindle, through the existing
shared connection, review, and progress-import flow.

Definition of done:

- Research available integration methods for the next e-reader provider.
- Add provider-specific connection and read logic without modifying device data.
- Reuse shared matching, conflict review, approval, and source-link handling.
- Apply only approved progress updates and preserve recovery on save failure.
- Prevent unchanged records from being imported repeatedly.
- Add tests for provider reads, matching, conflicts, disconnection, and import
  failures.

Context:

- `packages/frontend/src/renderer/sync/`
- `packages/contracts/src/types_subfolders/types-sync.ts`
- `apps/bartleby/src-tauri/src/commands.rs`
- `packages/frontend/tests/sync-import.test.mjs`
- `packages/frontend/tests/sync-session-rollback.test.mjs`
