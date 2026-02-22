# ISSUE-053: Stop linting generated desktop build artifacts

**Type:** tech-debt
**Priority:** P1
**Labels:** `tech-debt`, `devex`, `desktop`, `lint`

Problem:

`npm run lint:desktop` is currently linting generated build output (for example `electron/dist/**`) and emitted token artifacts (`electron/tokens/dist/**`). This creates a large amount of non-actionable noise and includes parser-project errors for generated files.

Expected:

Desktop lint should target maintained source files only. Generated artifacts should be excluded consistently, regardless of whether lint is run from repo root or from `electron/`.

Definition of done:

- Update lint script/config so generated output paths are never linted.
- Ensure `electron/tokens/dist/tokens.ts` is excluded from type-aware lint parsing.
- Run `npm run lint:desktop` and verify no lint entries reference `electron/dist/` or `electron/tokens/dist/`.
- Document the lint scope and exclusions in repo docs.

Context:

- `package.json`
- `electron/package.json`
- `electron/eslint.config.mjs`
- `electron/dist/`
- `electron/tokens/dist/tokens.ts`

