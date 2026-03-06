# ISSUE-078: Add Help/Logs miscellaneous guide

**Type:** tech-debt
**Priority:** P3
**Labels:** `tech-debt`, `docs`, `desktop`

Problem:

Even with tab-specific help, users still need a place for cross-cutting guidance that does not belong to one screen. Right now the Help/Logs surface does not cover app-wide concepts, troubleshooting, or general recovery guidance.

Expected:

Help/Logs includes a miscellaneous section for app-wide behaviors, navigation, troubleshooting, and basic recovery guidance.

Definition of done:

- Add cross-cutting help for navigation, app state, and common troubleshooting.
- Explain what the log output is for and what users should expect to see there.
- Include general guidance for layout quirks, stuck UI states, and when a restart or replan is appropriate.
- Keep this section separate from the tab-specific guides so it does not become a dumping ground.

Context:

- `electron/renderer/help.ts`
- `electron/index.html`
- `electron/renderer/logger.ts`
