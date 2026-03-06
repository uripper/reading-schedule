# ISSUE-070: Make non-Library tabs adapt to window size without outer scroll

**Type:** enhancement
**Priority:** P2
**Labels:** `enhancement`, `ux`, `desktop`

Problem:

Outside the Library area, the app relies too heavily on global scroll behavior instead of adapting layouts to the available window size. This makes smaller windows feel cramped and unstable.

Expected:

Today, Schedule, Recommendations, Stats, and Settings should reflow to fit smaller window sizes without depending on an outer app scrollbar for routine use.

Definition of done:

- Audit non-Library tabs for layout breakpoints and overflow behavior.
- Reflow or compress elements before falling back to a global scrollbar.
- Keep Library as the primary surface allowed to own larger scrolling content.
- Verify the result across several common desktop window sizes.

Context:

- `electron/index.html`
- `electron/styles/base.css`
- `electron/styles/stats.css`
- `electron/styles/settings.css`
- `electron/styles/today-carousel.css`
