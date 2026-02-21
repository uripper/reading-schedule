# ISSUE-011: Expand lint coverage to Electron TypeScript

**Type:** tech-debt  
**Priority:** P1  
**Labels:** `tech-debt`, `devex`, `desktop`

Problem:

Current lint command checks only `electron/scripts/**/*.mjs`; main/renderer TS gaps remain.

Expected:

Lint/static analysis for Electron TS should be part of normal local validation.

Definition of done:

- Add lint strategy for main + renderer TS files.
- Integrate into `ci:local`.
- Update docs with exact command contract.

Context:

- `electron/eslint.config.mjs`
- `electron/package.json`
- `electron/tsconfig.main.json`
- `electron/tsconfig.renderer.json`
