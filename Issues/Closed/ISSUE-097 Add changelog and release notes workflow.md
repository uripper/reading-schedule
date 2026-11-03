# ISSUE-097: Add changelog and release notes workflow

**Type:** tech-debt
**Priority:** P2
**Labels:** `tech-debt`, `docs`, `release`

Problem:

Desktop release and update mechanics are already documented in docs/desktop-updates.md and automated in the Desktop Release workflow. There is no checked-in changelog or contributor policy for substantive, per-version release notes; the workflow currently supplies generic installer text as its release body.

Expected:

The project should maintain either a checked-in changelog or a documented GitHub Releases workflow that contributors can follow consistently.

Definition of done:

- Choose the release-note source of truth.
- Add `CHANGELOG.md` or document the GitHub Releases process explicitly.
- Define when entries are added and at what level of detail.
- Backfill the current released or versioned milestones enough to establish the format.
- Put the release-note policy in the existing release documentation. Raise any proposed README link in chat, as required by AGENTS.md.

Context:

- `docs/desktop-updates.md`
- `.github/workflows/desktop-release.yml`
- `package.json`
- `apps/bartleby/package.json`
- `mobile/package.json`
- `AGENTS.md`
