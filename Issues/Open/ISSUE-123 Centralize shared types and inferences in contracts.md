# ISSUE-123: Centralize shared types and inferences in contracts

**Type:** tech-debt
**Priority:** P2
**Labels:** `tech-debt`, `architecture`, `contracts`, `typescript`

Problem:

Type definitions and inferred TypeScript shapes are still scattered across application-specific code in Electron, mobile, and other runtime folders. That duplication makes shared contracts harder to discover, increases drift between applications, and raises the risk that the same data shape is modeled differently in different runtimes.

Expected:

Reusable shared types and inference-backed contract shapes should live in `packages/contracts` by default so they can be imported consistently across current and future applications.

Definition of done:

- Define a contracts-first rule: if a type can be shared without pulling in app-specific runtime dependencies, it belongs in `packages/contracts`.
- Move reusable shared types and reusable inference-backed contract shapes out of app-specific folders and into `packages/contracts`, even when they currently have a single consumer.
- Update imports so Electron, mobile, website, and other consumers depend on the shared contracts package instead of duplicating contract shapes locally.
- Keep local types only for transient implementation state or shapes that would force `packages/contracts` to depend on app-specific platform/runtime libraries.
- Update contributor guidance so future shared contracts are added to `packages/contracts` by default.

Context:

- `packages/contracts/src/`
- `electron/types/`
- `electron/renderer/`
- `mobile/src/`
- `apps/website/src/`
- `STYLEGUIDE.md`
- `AGENTS.md`
