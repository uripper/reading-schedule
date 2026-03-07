# ISSUE-041: Add daily goal graph to Today screen

**Type:** enhancement
**Priority:** P2
**Labels:** `enhancement`, `ux`, `desktop`

Problem:

The Today screen shows a daily goal but provides no visual graph to communicate progress toward it. A graph gives users an immediate sense of where they stand and motivates completion.

Expected:

A daily goal graph (e.g. a bar or arc showing pages or minutes completed vs. goal) is visible on the Today screen and updates in real time as sessions are logged.

Definition of done:

- Add a daily goal graph component to the Today screen.
- Graph reflects today's logged session data vs. the configured daily goal.
- Graph updates without requiring a reload after a session is completed.
- Add tests for graph data binding and update behavior.

Context:

- `electron/renderer/app/today.ts`
- `electron/index.html`
- `electron/styles/base.css`
