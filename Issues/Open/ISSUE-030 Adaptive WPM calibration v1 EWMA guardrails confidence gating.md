# ISSUE-030: Adaptive WPM calibration v1 (EWMA + guardrails + confidence gating)

**Type:** enhancement
**Priority:** P1
**Labels:** `enhancement`, `ml`, `planner`, `desktop`, `testing`

Problem:

Current reading speed assumptions are static, causing plans to overestimate or underestimate realistic session completion time.

Expected:

Planner speed estimates adapt to observed session outcomes using bounded, explainable calibration rules.

Definition of done:

- Add EWMA-based updates for user baseline WPM and per-difficulty multipliers.
- Gate updates to high-confidence sessions and ignore low-quality observations.
- Clamp WPM and multipliers to safe ranges and document defaults.
- Add regression tests for calibration updates, clamping, and no-history fallback behavior.

Context:

- `src/reading_plan/solve.py`
- `src/reading_plan/domain.py`
- `electron/renderer/app/persistence.ts`
- `tests/`
