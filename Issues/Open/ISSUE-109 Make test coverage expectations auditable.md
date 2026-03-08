# ISSUE-109: Make test coverage expectations auditable

**Type:** tech-debt
**Priority:** P2
**Labels:** `tech-debt`, `testing`, `ci`

Problem:

Existing Python and desktop tests pass, but several important testing expectations remain hard to verify with current tooling: whether new code always gets tests, whether critical paths have integration coverage, whether edge cases and failure modes are covered, and whether repeated test setup should be extracted into shared helpers.

Expected:

The repository should define what must be tested, how that coverage is tracked, and how reviewers can tell when a behavior change is missing test support.

Definition of done:

- Define the critical paths that require unit, integration, or end-to-end coverage.
- Map current tests to those paths and identify the gaps.
- Add a coverage or change-review mechanism that makes missing test support visible.
- Extract repeated setup into shared fixtures or helpers where duplication is real.
- Document the policy in contributor or testing docs.

Context:

- `tests/`
- `electron/tests/`
- `electron/playwright.config.ts`
- `README.md`
- `STYLEGUIDE.md`
