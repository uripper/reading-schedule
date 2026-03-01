# ISSUE-054: Resolve strictNullChecks mismatch in desktop linting

**Type:** tech-debt
**Priority:** P1
**Labels:** `tech-debt`, `typescript`, `desktop`, `lint`

Problem:

`pnpm run lint:desktop` reports widespread prerequisite errors from type-aware rules because TypeScript is configured with `strict: false` in Electron tsconfig files. Today this appeared as 543 `strictNullChecks`-related lint errors before business-logic lint can be addressed.

Expected:

TypeScript compiler strictness and enabled ESLint rules should be aligned. Lint should report only actionable violations, not configuration-precondition failures.

Definition of done:

- Decide and document one direction:
  - Enable strict null checking in Electron TypeScript configs and migrate code.
  - Or disable/override rules that require strict null checking until migration is complete.
- Implement the chosen config changes in lint + tsconfig.
- Run `pnpm run lint:desktop` and confirm no `This rule requires the strictNullChecks compiler option` errors remain.
- Add a short migration note in docs if staged rollout is used.

Context:

- `electron/tsconfig.main.json`
- `electron/tsconfig.renderer.json`
- `electron/eslint.config.mjs`
- `/tmp/lint-desktop.log` (local run output)
