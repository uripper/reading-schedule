# ISSUE-088: Redesign Schedule tab

**Type:** enhancement
**Priority:** P1
**Labels:** `enhancement`, `ux`, `desktop`

Problem:

The Schedule tab needs a broader design pass. It is a core workflow surface, but the current structure and interactions do not feel cohesive enough.

Expected:

Schedule has a clearer day/session hierarchy, cleaner controls, and a more deliberate editing/completion experience.

Definition of done:

- Redesign the Schedule layout and interaction model as a cohesive surface.
- Improve hierarchy for days, sessions, state, and available actions.
- Preserve or improve keyboard and accessibility behavior.
- Add or update tests for behavior changed by the redesign.

Context:

- `electron/renderer/app/calendar_interactions/`
- `electron/renderer/calendar/`
- `electron/styles/calendar.css`
- `electron/styles/calendar-session-tidy.css`
