# ISSUE-015: Ship-or-hide placeholder Experience toggles

**Type:** tech-debt  
**Priority:** P2  
**Labels:** `tech-debt`, `desktop`, `ux`

Problem:

Several toggles are exposed but not fully implemented (`social`, `recommendations`, reminder behavior).

Expected:

Each visible toggle has real behavior, or is hidden until implemented.

Definition of done:

- Audit each toggle in Experience section.
- Implement or hide with explicit roadmap decision.
- Add tests/documentation for shipped behaviors.

Context:

- `electron/renderer/app/experience.ts`
- `electron/renderer/app/experience_bindings.ts`
- `electron/index.html`
