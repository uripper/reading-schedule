# ISSUE-076: Add Help/Logs guide for Stats

**Type:** tech-debt
**Priority:** P3
**Labels:** `tech-debt`, `docs`, `desktop`

Problem:

The Help/Logs surface does not explain the Stats view. Users need to know what each metric means, where the numbers come from, and how to interpret projections and streak-related values.

Expected:

Help/Logs includes a Stats guide that explains each major metric, its source, and any important caveats in the calculation.

Definition of done:

- Document the main Stats cards, charts, and summary values.
- Explain how streaks, completion rate, and projected finishes are derived at a high level.
- Call out any assumptions or caveats that can surprise users.
- Keep the guide practical instead of mathematically exhaustive.

Context:

- `electron/renderer/help.ts`
- `electron/index.html`
- `electron/renderer/stats/`
- `electron/renderer/stats.ts`
