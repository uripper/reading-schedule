# ISSUE-035: Reduce onboarding to a 4-step critical path


**Type:** enhancement
**Priority:** P1
**Labels:** `enhancement`, `ux`, `accessibility`, `desktop`

Problem:

Current onboarding and setup ask for too many early decisions before a user can generate and act on a first plan.

Expected:

Onboarding follows a four-step path that quickly leads to a generated plan and first-session action.

Definition of done:

- Implement four onboarding steps: daily minutes, reading time preference, first book quick-add, generate/show first session.
- Mark non-critical metadata and advanced options as optional follow-up.
- Add an onboarding completion metric hook for drop-off analysis.
- Add tests for the happy path and interrupted/resumed onboarding.

Context:

- `electron/renderer/`
- `electron/index.html`
- `electron/tests/`
- `ROADMAP.md`

