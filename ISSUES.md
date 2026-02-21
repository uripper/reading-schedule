# Bartleby Issues (Directory Layout)

Last updated: February 21, 2026

Issue definitions now live in per-issue files under:

- `Issues/Open/`
- `Issues/Closed/`

Each issue file should start with a canonical heading:

`# ISSUE-###: Title`

The GitHub sync script reads both folders:

- `scripts/sync_issues.sh`

Behavior:

- Files in `Issues/Open/` sync as open GitHub issues.
- Files in `Issues/Closed/` sync as closed GitHub issues.
- Issues are deduplicated by `Sync-ID: ISSUE-###` marker in issue body.
