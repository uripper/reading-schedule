# ISSUE-056: Normalize TypeScript type-style lint debt in desktop app

**Type:** tech-debt
**Priority:** P2
**Labels:** `tech-debt`, `typescript`, `desktop`, `lint`

Problem:

Desktop lint output shows a large set of type-style violations that are mostly mechanical but block clean lint runs:

- 190 `@typescript-eslint/method-signature-style`
- 114 `@typescript-eslint/consistent-type-definitions`
- 77 `@typescript-eslint/explicit-function-return-type`

Expected:

Type declarations and function signatures should consistently follow project lint standards so remaining lint failures are more signal-rich.

Definition of done:

- Convert object-like `type` aliases to `interface` where required by lint policy.
- Add explicit return types where required.
- Normalize method signatures to the configured style.
- Run `npm run lint:desktop` and confirm these rule families are fully resolved in touched modules.

Starter files:

- `electron/renderer/tabs.ts`
- `electron/renderer/sessions/utils.ts`
- `electron/renderer/settings/render.ts`
- `electron/window_find.ts`
- `electron/renderer/stats/model.ts`

Context:

- `electron/eslint.config.mjs`
- `/tmp/lint-desktop.log` (local run output)
