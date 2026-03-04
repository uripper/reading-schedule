# ISSUE-064: Turning off Gamification does not hide Momentum card on Today

**Type:** bug
**Priority:** P1
**Labels:** `bug`, `ux`, `desktop`

Problem:

Disabling Gamification in Settings does not hide the Momentum card on the Today screen. The UI keeps showing Momentum even when the gamification feature flag is off.

Expected:

When Gamification is turned off, the Momentum card is hidden immediately on Today and stays hidden across tab switches and app restarts.

Definition of done:

- Turning off `flagGamification` updates the Today UI in the same session with no manual refresh.
- Momentum remains hidden after navigating away from and back to Today.
- Persisted state with `gamificationEnabled: false` always renders Today without the Momentum card.
- Add regression tests for toggle-off behavior and initial render with gamification disabled.

Context:

- `electron/renderer/app/today/today.ts`
- `electron/renderer/app/experience/ui.ts`
- `electron/renderer/app/experience/bindings.ts`
- `electron/index.html`
