# ISSUE-030: Adaptive WPM calibration v1 (EWMA + guardrails + confidence gating)

**Type:** enhancement
**Priority:** P1
**Labels:** `enhancement`, `ml`, `planner`, `desktop`, `testing`

Problem:

Current reading speed assumptions are static, causing plans to overestimate or underestimate realistic session completion time. Underestimating is likely fine, and we can likely force a bit of underestimation to ensure users enjoy a sense of accomplishment. However, overestimation can lead to user frustration and disengagement.

Expected:

Planner speed estimates adapt to observed session outcomes using bounded, explainable calibration rules.

Definition of done:

- Add EWMA-based updates for user baseline WPM and per-difficulty multipliers in the shared Rust planner and contracts.
- Gate updates to high-confidence sessions and ignore low-quality observations.
- Clamp WPM and multipliers to safe ranges and document defaults.
- Add regression tests for calibration updates, clamping, and no-history fallback behavior.

Context:

- `packages/planner/src/native_planner/solve.rs`
- `packages/planner/src/native_planner/models.rs`
- `packages/contracts/src/`
- `packages/frontend/src/renderer/app/persistence.ts`
- `packages/frontend/tests/`
- `packages/planner/src/native_planner/regression_tests.rs`
