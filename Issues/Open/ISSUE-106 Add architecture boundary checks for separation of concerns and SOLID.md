# ISSUE-106: Add architecture boundary checks for separation of concerns and SOLID

**Type:** tech-debt
**Priority:** P2
**Labels:** `tech-debt`, `architecture`, `tooling`

Problem:

Ownership boundaries are documented in docs/architecture/monorepo-structure.md, and contracts-first audits exist. Dedicated dependency-graph checks for forbidden cross-layer imports, UI/domain separation, and adapter seams are still absent. Build on the current architecture instead of defining boundaries for removed runtimes.

Expected:

The repository should define architectural boundaries clearly and enforce the parts that can be checked automatically.

Definition of done:

- Enforce supported boundaries between the shared Rust planner, native Tauri commands/storage, desktop host adapters, shared frontend, contracts, website, and mobile.
- Add dependency-graph or import-boundary checks where practical.
- Define an adapter policy for persistence, external services, and third-party APIs.
- Add an architecture review template or ADR expectation for boundary changes.
- Document how reviewers should evaluate the remaining non-automated SOLID items.

Context:

- `docs/architecture/monorepo-structure.md`
- `STYLEGUIDE.md`
- `packages/planner/src/`
- `packages/contracts/`
- `apps/bartleby/src-tauri/src/`
- `apps/bartleby/src/runtime/`
- `packages/frontend/src/renderer/`
- `apps/website/src/`
- `mobile/src/`
- `scripts/style_audit/config.mjs`
