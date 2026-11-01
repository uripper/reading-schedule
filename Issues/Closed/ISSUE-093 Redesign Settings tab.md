# ISSUE-093: Redesign Settings tab

**Type:** enhancement
**Priority:** P2
**Labels:** `enhancement`, `ux`, `desktop`

Problem:

The Settings tab needs a broader design pass. The current layout makes configuration feel more mechanical and cluttered than it should.

Expected:

Settings has a clearer structure, better section hierarchy, and a more deliberate configuration experience.

Definition of done:

- Redesign Settings as a cohesive control surface rather than a loose collection of fields.
- Improve scanability, grouping, and section framing.
- Preserve current settings behavior unless explicitly changed by linked issues.
- Add or update tests for behavior changed by the redesign.

Context:

- `electron/renderer/settings.ts`
- `electron/renderer/settings/render.ts`
- `electron/renderer/settings/config.ts`
- `electron/styles/settings.css`
