# ISSUE-064: Turning off Gamification does not hide all Today gamification UI

**Type:** bug
**Priority:** P1
**Labels:** `bug`, `ux`, `desktop`

Problem:

Disabling Gamification in Settings does not hide all gamification-only UI on Today. The Daily Streak header metric and related momentum surfaces can remain visible even when the gamification feature flag is off.

Expected:

When Gamification is turned off, all Today-only gamification surfaces are hidden immediately and stay hidden across tab switches and app restarts.

Definition of done:

- Turning off `flagGamification` updates the Today UI in the same session with no manual refresh.
- The header Daily Streak metric is hidden when gamification is disabled.
- Momentum and any other gamification-only Today surfaces remain hidden after navigating away from and back to Today.
- Persisted state with `gamificationEnabled: false` always renders Today without gamification-only UI.
- Add regression tests for toggle-off behavior and initial render with gamification disabled.

Context:

- `electron/renderer/app/today/today.ts`
- `electron/renderer/app/today/today_header.ts`
- `electron/renderer/app/experience/ui.ts`
- `electron/renderer/app/experience/bindings.ts`
- `electron/index.html`
- `electron/styles/today-header.css`
