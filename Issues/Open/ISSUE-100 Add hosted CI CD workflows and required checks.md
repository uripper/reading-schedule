# ISSUE-100: Add hosted CI CD workflows and required checks

**Type:** tech-debt
**Priority:** P1
**Labels:** `tech-debt`, `ci`, `devex`

Problem:

The Desktop Release workflow already validates and publishes versioned desktop releases on qualifying pushes to main. It does not run pull-request validation, and its validation job is skipped when the canonical desktop version is unchanged. The local ci:local command is also narrower than the required full checks. Pull-request checks and required-status policy still need to be established; branch-protection settings must be inspected on GitHub before asserting whether they are configured.

Expected:

Pull requests and pushes should run required validation in hosted CI, and supported release targets should have an explicit CD or release workflow.

Definition of done:

- Add pull-request and ordinary-push validation for lint, typecheck, tests, and builds that match repository policy, including supported shared packages and the website.
- Surface pass or fail status in pull requests.
- Mark core validation jobs as required checks.
- Reuse the existing desktop release workflow and retain its signed Windows/macOS updater checks; do not create a duplicate release pipeline.
- Keep workflow commands aligned with `STYLEGUIDE.md` and root scripts.

Context:

- `.github/workflows/desktop-release.yml`
- `docs/desktop-updates.md`
- `package.json`
- `STYLEGUIDE.md`
