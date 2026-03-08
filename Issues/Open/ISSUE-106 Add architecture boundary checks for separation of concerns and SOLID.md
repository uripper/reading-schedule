# ISSUE-106: Add architecture boundary checks for separation of concerns and SOLID

**Type:** tech-debt
**Priority:** P2
**Labels:** `tech-debt`, `architecture`, `tooling`

Problem:

The repository does not currently have measurable checks for UI-vs-business-logic boundaries, data loading vs rendering splits, dependency inversion, adapter seams around third-party services, or cross-layer import rules. These concerns are hard to review consistently without explicit architecture guardrails.

Expected:

The repository should define architectural boundaries clearly and enforce the parts that can be checked automatically.

Definition of done:

- Define supported boundaries between planner core, contracts, Electron main, Electron renderer, and mobile.
- Add dependency-graph or import-boundary checks where practical.
- Define an adapter policy for persistence, external services, and third-party APIs.
- Add an architecture review template or ADR expectation for boundary changes.
- Document how reviewers should evaluate the remaining non-automated SOLID items.

Context:

- `STYLEGUIDE.md`
- `src/reading_plan/`
- `packages/contracts/`
- `electron/main/`
- `electron/renderer/`
- `mobile/src/`
