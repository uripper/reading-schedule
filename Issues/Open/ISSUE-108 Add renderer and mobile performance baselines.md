# ISSUE-108: Add renderer and mobile performance baselines

**Type:** tech-debt
**Priority:** P2
**Labels:** `tech-debt`, `performance`, `desktop`, `mobile`

Problem:

The current toolchain does not measure key performance risks such as unnecessary re-renders, hot-path recomputation, lazy-loading effectiveness, or render cost in the busiest desktop and mobile views. Reviewers can only estimate performance quality from code inspection.

Expected:

Critical flows should have documented hotspots, repeatable profiling steps, and baseline metrics so regressions are visible.

Definition of done:

- Identify the main performance-sensitive flows for desktop and mobile.
- Add a repeatable profiling or benchmark procedure for those flows.
- Capture baseline measurements and document acceptable regression thresholds.
- Add lightweight instrumentation where it helps make regressions visible.
- Document caching, memoization, and lazy-load expectations for the identified hotspots.

Context:

- `electron/renderer/app/today/`
- `electron/renderer/calendar/`
- `electron/renderer/book_lookup/`
- `mobile/src/features/today/`
