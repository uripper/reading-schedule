# ISSUE-079: Define streak freeze-day policy for unscheduled days

**Type:** enhancement
**Priority:** P2
**Labels:** `enhancement`, `ux`, `desktop`, `planner`

Problem:

The current streak calculation counts consecutive calendar days that meet the reading goal and does not receive schedule-day information. A missed goal therefore breaks the streak even on an unscheduled day; there is no explicit freeze-day policy. That creates ambiguity around weekends, skipped planning days, and whether a user should be penalized for days the app did not ask them to read.

Expected:

The product has an explicit streak policy for unscheduled days, and that policy is reflected consistently in calculations, UI copy, and user expectations.

Definition of done:

- Decide whether unscheduled days freeze a streak, break a streak, or are handled some other way.
- Apply the chosen rule consistently in streak calculations and displays.
- Explain the rule in user-facing copy where it matters.
- Add regression coverage for scheduled and unscheduled day transitions.

Context:

- `packages/frontend/src/renderer/activity/day-minutes.ts`
- `packages/frontend/src/renderer/app/today/today.ts`
- `packages/frontend/src/renderer/stats/model.ts`
- `packages/planner/src/`
