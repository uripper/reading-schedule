# ISSUE-102: Resolve undersized `electron/types` module audit failure

**Type:** tech-debt
**Priority:** P2
**Labels:** `tech-debt`, `refactor`, `desktop`, `tooling`

Problem:

`pnpm run audit` currently fails because `electron/types/types.ts` has only 1 code line, below the 30-line minimum enforced for `electron/types`. Tiny shim files like this create indirection without pulling their weight and leave the audit red.

Expected:

`electron/types` files should either represent meaningful type modules or be merged away so the audit rule passes cleanly.

Definition of done:

- Decide whether `electron/types/types.ts` should be removed, merged, or expanded into a real type module.
- Keep import paths coherent for callers after the change.
- Re-run `pnpm run audit` and clear the undersized-file failure.
- Document the intended role of tiny type-shim files if any exceptions remain.

Context:

- `STYLEGUIDE.md`
- `scripts/style_audit.mjs`
- `electron/types/types.ts`

