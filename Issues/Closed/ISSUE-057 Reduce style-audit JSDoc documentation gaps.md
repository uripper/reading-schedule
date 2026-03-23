# ISSUE-057: Reduce style-audit JSDoc documentation gaps

**Type:** tech-debt
**Priority:** P3
**Labels:** `tech-debt`, `docs`, `desktop`, `tooling`

Problem:

`pnpm run styleaudit` reported 758 probable documentation gaps (missing module-level or declaration-level JSDoc). This makes the audit noisy and weakens API discoverability for contributors.

Expected:

Documentation expectations should be realistic, consistent, and focused on high-value modules. Style-audit output should be actionable rather than overwhelming.

Definition of done:

- Define a phased scope for JSDoc cleanup (for example main process + renderer entry modules first).
- Add missing module/declaration JSDoc for the first scope.
- Re-run `pnpm run styleaudit` and reduce documentation-gap count by a meaningful first milestone.
- Document any intentional exclusions in `scripts/style_audit.mjs` or contributor docs.

Context:

- `scripts/style_audit.mjs`
- `electron/main*.ts`
- `electron/renderer/**/*.ts`
- `/tmp/style-audit.log` (local run output)
