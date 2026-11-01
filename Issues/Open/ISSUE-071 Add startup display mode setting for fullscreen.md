# ISSUE-071: Add startup display mode setting for fullscreen

**Type:** enhancement
**Priority:** P3
**Labels:** `enhancement`, `ux`, `desktop`

Problem:

The app launches in a single fixed window mode today. Users who prefer fullscreen or who want the app to reopen in its last-used display state do not have control over startup behavior.

Expected:

Users can choose a startup display mode such as windowed, fullscreen, or remember last window state.

Definition of done:

- Define supported startup display modes and a default.
- Persist the chosen startup display mode in settings.
- Apply the selected mode when creating the desktop window.
- Verify fullscreen and windowed launches behave correctly across restarts.

Context:

- `apps/bartleby/src-tauri/src/lib.rs`
- `apps/bartleby/src-tauri/tauri.conf.json`
- `apps/bartleby/src-tauri/src/state_store/`
- `packages/frontend/src/renderer/settings.ts`
- `packages/frontend/src/renderer/settings/config.ts`
- `packages/contracts/src/types_subfolders/types_experience.ts`
