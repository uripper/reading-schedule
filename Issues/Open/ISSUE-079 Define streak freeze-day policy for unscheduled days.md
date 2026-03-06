# ISSUE-079: Define streak freeze-day policy for unscheduled days

**Type:** enhancement
**Priority:** P2
**Labels:** `enhancement`, `ux`, `desktop`, `planner`

Problem:

The streak model does not have a clearly defined policy for days when no reading is scheduled. That creates ambiguity around weekends, skipped planning days, and whether a user should be penalized for days the app did not ask them to read.

Expected:

The product has an explicit streak policy for unscheduled days, and that policy is reflected consistently in calculations, UI copy, and user expectations.

Definition of done:

- Decide whether unscheduled days freeze a streak, break a streak, or are handled some other way.
- Apply the chosen rule consistently in streak calculations and displays.
- Explain the rule in user-facing copy where it matters.
- Add regression coverage for scheduled and unscheduled day transitions.

Context:

- `electron/renderer/activity/day_minutes.ts`
- `electron/renderer/app/today/today.ts`
- `electron/renderer/stats/model.ts`
- `src/reading_plan/`
