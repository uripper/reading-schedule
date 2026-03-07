# ISSUE-074: Add Help/Logs guide for Schedule

**Type:** tech-debt
**Priority:** P3
**Labels:** `tech-debt`, `docs`, `desktop`

Problem:

The Help/Logs surface does not explain how the Schedule workflow behaves. Users need to understand planned sessions, edits, completions, manual changes, and how schedule mutations affect their plan.

Expected:

Help/Logs includes a Schedule guide that explains the planning surface, key interactions, and the consequences of changing schedule rows.

Definition of done:

- Document how to read a scheduled session row and what each control does.
- Explain editing, removing, and completing schedule entries where applicable.
- Clarify how replans and manual changes interact.
- Include short troubleshooting notes for common schedule confusion.

Context:

- `electron/renderer/help.ts`
- `electron/index.html`
- `electron/renderer/app/calendar_interactions/`
- `electron/renderer/calendar/`
