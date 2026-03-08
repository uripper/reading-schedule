# ISSUE-097: Add changelog and release notes workflow

**Type:** tech-debt
**Priority:** P2
**Labels:** `tech-debt`, `docs`, `release`

Problem:

There is no `CHANGELOG.md` and no documented release-note source of truth. That makes it difficult to understand what changed between versions or to produce stable release communication for downloads.

Expected:

The project should maintain either a checked-in changelog or a documented GitHub Releases workflow that contributors can follow consistently.

Definition of done:

- Choose the release-note source of truth.
- Add `CHANGELOG.md` or document the GitHub Releases process explicitly.
- Define when entries are added and at what level of detail.
- Backfill the current released or versioned milestones enough to establish the format.
- Link the changelog or release-note policy from `README.md`.

Context:

- `README.md`
- `package.json`
- `electron/package.json`
- `mobile/package.json`

