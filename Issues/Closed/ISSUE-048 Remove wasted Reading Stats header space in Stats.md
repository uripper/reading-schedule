# ISSUE-048: Remove wasted "Reading Stats" header and subtitle from Stats screen

**Type:** enhancement
**Priority:** P2
**Labels:** `enhancement`, `ux`, `desktop`

Problem:

The "Reading stats" heading and its subtitle "Track long-term progress, finish forecasts, and completion momentum." occupy significant vertical space on the Stats screen without adding value for a user who is already on the Stats screen.

Expected:

The redundant header and subtitle are removed. The Stats screen starts directly with its content.

Definition of done:

- Remove the "Reading stats" heading and subtitle elements from the Stats screen.
- Verify no layout shifts or spacing regressions below the removed elements.
- Update any tests that assert on this text being present.

Context:

- `electron/renderer/app/stats.ts`
- `electron/index.html`
