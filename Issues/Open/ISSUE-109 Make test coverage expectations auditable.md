# ISSUE-109: Make test coverage expectations auditable

**Type:** tech-debt
**Priority:** P2
**Labels:** `tech-debt`, `testing`, `ci`

Problem:

The current test surfaces are shared frontend Node tests, desktop adapter tests, and native Rust planner/runtime unit tests. The style audit already measures test-file/source-file ratios and attempts frontend execution coverage, but that is not a critical-path integration or end-to-end coverage map. The audit currently fails its coverage gates, so do not assume all quality checks pass or that a historical browser-test configuration still exists.

Expected:

The repository should define what must be tested, how that coverage is tracked, and how reviewers can tell when a behavior change is missing test support.

Definition of done:

- Define the critical paths that require unit, integration, or end-to-end coverage.
- Map current tests to those paths and identify the gaps.
- Repair and extend the existing coverage audit and add a change-review mechanism for missing behavior tests; distinguish source-file ratios from executed line/branch coverage.
- Extract repeated setup into shared fixtures or helpers where duplication is real.
- Document the policy in contributor or testing docs.

Context:

- `packages/frontend/tests/`
- `apps/bartleby/tests/`
- `apps/bartleby/src-tauri/src/state_store_tests.rs`
- `packages/planner/src/native_planner/tests.rs`
- `scripts/style_audit/coverage.mjs`
- `scripts/style_audit/config.mjs`
- `STYLEGUIDE.md`
