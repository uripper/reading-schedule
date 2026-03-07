# ISSUE-072: Add Help/Logs guide for Today

**Type:** tech-debt
**Priority:** P3
**Labels:** `tech-debt`, `docs`, `desktop`

Problem:

The Help/Logs surface does not give users useful guidance for the Today workflow. Users need a simple explanation of what Today is for, how to use it, and what the live indicators mean.

Expected:

Help/Logs includes a concise but complete Today guide that explains the screen's purpose, main actions, key indicators, and basic troubleshooting notes.

Definition of done:

- Document the purpose of the Today screen and the main daily workflow.
- Explain key controls and indicators such as streak, sessions, progress chips, and completion state.
- Add short troubleshooting notes for common Today confusion points.
- Keep the copy readable at a high level while still useful as a practical guide.

Context:

- `electron/renderer/help.ts`
- `electron/index.html`
- `electron/renderer/app/today/`
