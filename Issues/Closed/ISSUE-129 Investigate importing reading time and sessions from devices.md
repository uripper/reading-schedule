# ISSUE-129: Investigate importing reading time and sessions from devices

**Type:** enhancement
**Priority:** P3
**Labels:** `enhancement`, `desktop`, `planner`

Problem:

Progress sync only reads the latest record for a book. If the device stores reading time or session history, that information could also fill out Bartleby's sessions automatically.

Expected:

Investigate whether Kobo exposes reliable reading-time or session data, then define a separate session-import approach if the data supports it. This is a larger follow-up than importing the latest percentage.

Definition of done:

- Inspect supported database schemas for reading events, durations, and historical records beyond the latest content row.
- Establish whether available values represent individual sessions, cumulative time, or estimates.
- Document feasibility and limitations before committing to automatic session creation.
- Define how source events map to existing Bartleby sessions, including timestamps, books, and duration units.
- Plan deduplication across repeated connections and devices without double-counting manual sessions.
- Keep unsupported or incomplete timing data from being turned into invented sessions.

Context:

- Research follow-up to ISSUE-022, e-reader synchronization.
- Related to ISSUE-128, managing source and device links.
- `apps/bartleby/src-tauri/src/kobo.rs`
- `packages/frontend/src/renderer/sessions/`
