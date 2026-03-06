# ISSUE-077: Add Help/Logs guide for Settings

**Type:** tech-debt
**Priority:** P3
**Labels:** `tech-debt`, `docs`, `desktop`

Problem:

The Help/Logs surface does not explain what the Settings controls do or how they affect planning, UI behavior, and experience features.

Expected:

Help/Logs includes a Settings guide that explains the purpose and impact of each settings section in plain language.

Definition of done:

- Document each major settings section and what it changes.
- Explain any settings that alter planning behavior, UI behavior, or gamification visibility.
- Call out settings that take effect immediately versus on next launch or next plan generation.
- Keep the guide concise enough to browse while still being complete.

Context:

- `electron/renderer/help.ts`
- `electron/index.html`
- `electron/renderer/settings/`
- `electron/renderer/settings.ts`
