# ISSUE-075: Add Help/Logs guide for Recommendations

**Type:** tech-debt
**Priority:** P3
**Labels:** `tech-debt`, `docs`, `desktop`

Problem:

The Help/Logs surface does not explain what the Recommendations area is supposed to do, how results are chosen, or how to act on them.

Expected:

Help/Logs includes a Recommendations guide that explains the tab's purpose, how recommendation results are sourced, and what actions users can take from that view.

Definition of done:

- Document what Recommendations is for and what inputs it depends on.
- Explain how to search, review, and add recommended books.
- Clarify any limitations or expected rough edges in the current recommendation flow.
- Keep the guide concise and task-oriented.

Context:

- `electron/renderer/help.ts`
- `electron/index.html`
- `electron/renderer/recommendations/`
