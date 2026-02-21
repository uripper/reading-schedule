# ISSUE-036: Add reminder control surface (opt-in cadence, quiet hours, one-click disable)


**Type:** enhancement
**Priority:** P1
**Labels:** `enhancement`, `ux`, `accessibility`, `privacy`, `desktop`

Problem:

Reminder controls are currently incomplete, making reminders hard to trust and potentially intrusive.

Expected:

Reminder behavior is fully user-controlled with explicit opt-in, throttling controls, and immediate disable options.

Definition of done:

- Require explicit opt-in before sending reminders.
- Add cadence controls, quiet hours, and one-click disable in settings.
- Ensure reminder UI explains current state and last-change source.
- Add tests for opt-in defaults, quiet-hour suppression, and disable behavior.

Context:

- `electron/renderer/app/experience.ts`
- `electron/renderer/app/experience_bindings.ts`
- `electron/renderer/settings.ts`
- `electron/tests/`
