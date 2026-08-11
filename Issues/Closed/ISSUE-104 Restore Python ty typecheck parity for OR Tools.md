# ISSUE-104: Restore Python `ty` typecheck parity for OR-Tools

**Type:** bug
**Priority:** P1
**Labels:** `bug`, `python`, `tooling`

Problem:

`pnpm run typecheck:python` currently fails with `unresolved-import` for `ortools.sat.python` in `src/reading_plan/planning/solve.py`. That breaks a required repository validation command and makes Python typecheck results environment-dependent.

Expected:

`ty check src` should pass in the documented development environment, with OR-Tools resolved consistently and reproducibly.

Definition of done:

- Decide how OR-Tools should be resolved for `ty` in local and CI environments.
- Update environment bootstrap or typecheck configuration so the intended interpreter and site-packages are used.
- Add any needed stubs, wrapper modules, or targeted ignores only if they are justified.
- Document the expected Python setup clearly.
- Re-run `pnpm run typecheck:python` successfully.

Context:

- `package.json`
- `pyproject.toml`
- `README.md`
- `src/reading_plan/planning/solve.py`

