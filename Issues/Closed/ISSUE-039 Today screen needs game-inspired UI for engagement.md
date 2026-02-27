# ISSUE-039: Today screen looks bland and needs game-inspired UI

**Type:** enhancement
**Priority:** P2
**Labels:** `enhancement`, `ux`, `desktop`

Problem:

The Today screen is visually plain and does not create the sense of motivation or stickiness needed to drive daily usage. Game UI patterns (progress indicators, visual rewards, energy/momentum framing) are proven to encourage return visits.

Expected:

The Today screen borrows visual language from game UIs — bold typography, progress arcs or rings, visual momentum cues — to make the daily reading habit feel rewarding and worth returning to.

Definition of done:

- Redesign Today screen layout with a more visually engaging structure.
- Introduce at least one game-inspired element (e.g. XP-style progress ring, streak flame, level indicator).
- Ensure the design remains functional and does not obscure core session actions.
- No regressions in Today screen keyboard navigation or accessibility.

Context:

- `electron/renderer/app/today.ts`
- `electron/renderer/app/today_schedule.ts`
- `electron/styles/base.css`
- `electron/index.html`
