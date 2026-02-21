# ISSUE-033: Add settings dual-mode (Simple vs Advanced) with progressive disclosure


**Type:** enhancement
**Priority:** P1
**Labels:** `enhancement`, `ux`, `accessibility`, `desktop`

Problem:

Settings currently expose a large control surface that increases cognitive load for users who only need core planner controls.

Expected:

Users can choose a Simple settings mode for core controls while retaining full access to Advanced mode when needed.

Definition of done:

- Define Simple-mode field set and hide advanced controls by default.
- Add explicit mode switch with persistence and keyboard accessibility.
- Ensure no hidden setting changes behavior silently when switching modes.
- Add UI tests for mode transitions and saved-state restoration.

Context:

- `electron/renderer/settings.ts`
- `electron/renderer/settings/config.ts`
- `electron/index.html`
- `electron/styles/`

