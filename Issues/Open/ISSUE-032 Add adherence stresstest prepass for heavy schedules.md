# ISSUE-032: Add adherence stress-test pre-pass for heavy schedules


**Type:** enhancement
**Priority:** P2
**Labels:** `enhancement`, `ml`, `planner`, `desktop`, `testing`

Problem:

Some plans are technically valid but likely to fail in practice because session load is too heavy for recent user behavior.

Expected:

Before finalizing a schedule, the planner can detect low-adherence risk patterns and apply conservative load adjustments.

Definition of done:

- Define a pre-pass scoring model using available scheduling-time features.
- Reduce per-session load or switching pressure when risk thresholds are exceeded.
- Surface transparent UI messaging when stress-test adjustments are applied.
- Add tests for threshold behavior and unchanged output when risk is low.

Context:

- `src/reading_plan/solve.py`
- `src/reading_plan/heuristics.py`
- `electron/renderer/app/plan.ts`
- `electron/tests/`

