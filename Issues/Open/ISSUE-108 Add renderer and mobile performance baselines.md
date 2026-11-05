# ISSUE-108: Add renderer and mobile performance baselines

**Type:** tech-debt
**Priority:** P2
**Labels:** `tech-debt`, `performance`, `desktop`, `mobile`

Problem:

The shared Rust planner already has a production benchmark and stage timings, and frontend responsiveness tests cover some orchestration paths. Repeatable desktop WebView and mobile rendering baselines are still missing for unnecessary re-renders, hot-path recomputation, lazy-loading effectiveness, and busy-view render cost; the planner benchmark excludes Tauri transport, storage, and UI.

Expected:

Critical flows should have documented hotspots, repeatable profiling steps, and baseline metrics so regressions are visible.

Definition of done:

- Identify the main performance-sensitive desktop flows and extend the baseline to mobile when the next client is available.
- Add a repeatable profiling or benchmark procedure for those flows.
- Capture baseline measurements and document acceptable regression thresholds.
- Add lightweight instrumentation where it helps make regressions visible.
- Document caching, memoization, and lazy-load expectations for the identified hotspots.

Context:

- `packages/frontend/src/renderer/app/today/`
- `packages/frontend/src/renderer/calendar/`
- `packages/frontend/src/renderer/book_lookup/`
- `packages/frontend/tests/planner-responsiveness.test.mjs`
- ISSUE-132 tracks the next mobile client.
- `packages/planner/src/native_planner/benchmark/`
- `docs/planner-benchmark.md`
