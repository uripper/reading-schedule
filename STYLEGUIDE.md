# Bartleby Engineering Style Guide

This document defines mandatory coding and collaboration standards for this repository.
If a rule here conflicts with convenience, the rule wins.

## Scope

Applies to all code and docs in:

- `src/`
- `electron/`
- `apps/`
- `packages/`
- `services/`
- `scripts/`
- `tests/`

## Non-Negotiable Rules (MUST)

- Keep function complexity under 10.
- Keep files less than 100 lines in at least 90% of cases.
- Keep files under 200 lines in 100% of cases; split files when necessary.
- Do not use ternaries.
- Do not use magic numbers.
- Do not introduce implicit `any` in TypeScript.
- Always perform lint checks.
- Always run required type checks; zero type errors is mandatory.

## Merge Blockers

A PR must not merge if any of the following is true:

- Any MUST rule is violated.
- Any required lint/typecheck/test command fails.
- Any typecheck error exists in touched areas.
- A behavior change is missing tests.
- A contract/config change is missing docs.

## Code Rules

### Function Design

- One function should do one job.
- Use early returns instead of deep nesting.
- Keep function bodies small and extract helpers when branching grows.
- Do not declare functions inside blocks.
- Group all shorthand properties together at the beginning or end of object declarations.

### File and Module Design

- Prefer many small focused modules over large mixed-purpose files.
- Split by responsibility, not by arbitrary type groupings.
- Avoid circular dependencies.
- For feature directories (for example under `electron/renderer/app/*`), expose cross-feature APIs through a local `index.ts` barrel and prefer importing from that barrel instead of deep relative file paths.
- Keep feature module naming predictable by role when practical (for example `model`, `ui`, `bindings`, `availability`, `schedule_completions`) instead of mixed naming styles.

### Control Flow and Readability

- Always use braces for `if`, `else`, `for`, and `while`.
- Keep one statement per line.
- Do not use ternaries (`condition ? a : b`).
- Prefer explicit `if`/`else` branches.

### Constants and Numbers

- Replace non-trivial numeric literals with named constants.
- Constant names must be domain-semantic and include units when relevant (`MS_PER_SECOND`, `MAX_RESULTS`).
- Keep constants close to their usage scope unless shared.

### Naming

- Use descriptive names, not unexplained abbreviations.
- Include units in variable names (`durationMs`, `minutesPerDay`).
- Use clear boolean names (`isComplete`, `hasDeadline`, `canPersist`).

### Runtime and Platform Safety

- Prefer `globalThis` over `window` for global APIs.
- Do not cast `globalThis` to `Window`; type only the specific global members you need.
- Validate external input at boundaries.
- Fail fast on invalid state with actionable messages.

### Error Handling

- Do not silently swallow exceptions.
- `catch` blocks must either recover with context or rethrow with context.
- User-visible errors must be actionable.
- Use logging over console statements for most situations. Only exceptions:
  - assert
  - clear
  - count
  - group
  - groupCollapsed
  - groupEnd
  - info
  - table
  - time
  - timeEnd
  - trace
- If you can do those in logging, do them there.

### Static Analysis Compliance (TypeScript)

- Treat Sonar and lint violations as style violations; do not defer cleanup in touched files.
- `typescript:S106` (`console` usage):
  - Do not use `console.error`, `console.warn`, `console.log`, or `console.debug` in committed code.
  - Allowed console methods are only: `assert`, `clear`, `count`, `group`, `groupCollapsed`, `groupEnd`, `info`, `table`, `time`, `timeEnd`, `trace`.
  - Prefer user-facing recovery paths (`announce(...)`, status text updates, typed error returns) over console output in renderer code.
- `typescript:S3499` (object literal shorthand grouping):
  - Keep shorthand properties contiguous, grouped either at the top or bottom of each object literal.
  - Do not interleave shorthand and non-shorthand properties.
- `typescript:S3735` (`void` operator):
  - Do not use `void` to silence Promise-returning calls.
  - For intentional fire-and-forget behavior, attach explicit handling (`promise.catch(...)`) or await from an async boundary.
- Additional Sonar-driven readability/reliability rules:
  - Prefer optional chaining over manual null checks when behavior is equivalent (`obj?.prop`, `obj?.method()`).
  - For defaulting assignments, prefer nullish assignment (`??=`) instead of verbose reassignment patterns.
  - Do not chain mutating `.sort()` inside expressions. Use a separate statement or non-mutating `.toSorted(...)`.
  - Always provide an explicit compare callback for alphabetical string sorts using `String.prototype.localeCompare`.
  - Avoid implicit object-to-string coercion (`value || ""`, template literals with unknown values, `String(value)` on unknown objects) unless the value is first narrowed to `string`.
  - Remove redundant type assertions that do not narrow or otherwise change the static type.

## Testing and Verification

- New behavior requires tests.
- Bug fixes require regression tests when practical.
- Refactors must keep behavior stable and tests green.
- If behavior changes intentionally, update tests and docs in the same change.

## Tooling Baseline

- IDE-only diagnostics are advisory unless they map to required validation commands.
- Keep analyzer scope aligned with real commands. Do not enable file patterns in config that are not validated in CI/local required commands.
- Electron main-process TypeScript is enforced by `tsc` (`npm --prefix electron run typecheck`), not by ESLint parsing.
- `electron/tsconfig.main.json` must include all main-process entry files via wildcard patterns (for example `*.ts`) instead of hand-maintained per-file include lists.
- If you add a new checker or rule set, wire it into a required command in this guide in the same change.
- After changing lint/parser config, run the target command once on representative files and confirm there are no parser crashes.

### SonarQube Workflow

- Keep Sonar project identity consistent across tooling:
  - `sonar-project.properties` `sonar.projectKey` must match `.vscode/settings.json` `sonarlint.connectedMode.project.projectKey`.
- Use token-based auth with `sonar.token`; do not introduce new usage of deprecated `sonar.login` for scanner auth.
- Keep scanner scope explicit in `sonar-project.properties`:
  - Maintain `sonar.sources`, `sonar.exclusions`, and `sonar.typescript.tsconfigPaths` when adding new source roots or tsconfig files.
  - Keep `sonar.python.version` aligned with the active Python version used by this repository.
- Keep SonarQube for IDE standalone exclusions in `.vscode/settings.json` under `sonarlint.analysisExcludesStandalone` using glob patterns for generated/dependency paths.
- After changing Sonar connected-mode settings or bindings, refresh IDE state:
  - Run `SonarQube for IDE: Update all project bindings`.
  - Reload the window (`Developer: Reload Window`).
- When issue navigation in IDE is stale or broken, run a fresh scan before debugging rules:
  - `SONAR_HOST_URL="http://localhost:9000" SONAR_TOKEN="<token>" npm run sonar:scan -- -Dsonar.projectKey=Bartleby`

## Required Validation Commands

Run all commands relevant to touched areas before merge.

### Electron

- `npm --prefix electron run lint`
- `npm --prefix electron run typecheck`
- `npm --prefix electron run build`

### Python Planner

- `.venv/bin/pytest -q`

If any required command fails, do not merge.

## Collaboration Policy

- Keep PRs focused and minimal in scope.
- Do not mix unrelated refactors with behavior changes.
- Document intent, risk, and rollback path in PR descriptions.
- Include screenshots for UI changes.
- Include reproducible steps for bug fixes.
- Address review comments with code changes or explicit technical rationale.

## Documentation Policy

- Update docs in the same PR when changing user-visible behavior.
- Update docs in the same PR when changing commands or scripts.
- Update docs in the same PR when changing configuration formats.
- Update docs in the same PR when changing API contracts.

### Code Documentation

Documentation is required in both Python and TypeScript. The following must be documented:

- **Modules**: Every module must have a top-level docstring (Python) or a JSDoc block comment (TypeScript) describing its purpose and responsibility.
- **Classes**: Every class must have a docstring or JSDoc comment explaining what it represents and its invariants.
- **Functions**: Every non-trivial function must have a docstring or JSDoc comment describing its behavior, parameters, and return value.
- **Hard-to-determine logic**: Any block of code whose intent is not immediately clear must have a comment explaining the why, not just the what.

Write comments for intent and constraints, not obvious mechanics.

Line comments must always appear on the line immediately above the code they describe. Do not write inline end-of-line comments.

## Exception Process

Temporary exceptions require all of the following:

- A linked issue with owner and due date.
- An inline `TODO` referencing that issue.
- Explicit reviewer approval in the PR.
- A follow-up task to remove the exception.

## Definition of Done

A change is done only when all are true:

- No MUST rules are violated.
- Required lint/typecheck/tests pass.
- No new complexity or file-size violations are introduced.
- Docs/tests are updated for behavior or contract changes.
- Reviewer can understand intent without reverse-engineering the code.

## Quick Violation Checks (Recommended)

- Local style audit (line limits + quick static checks): `npm run audit`

- Ternary scan: `rg -n "\?.*:.*" src electron scripts tests`

- Long file scan: `find src electron scripts tests -name "*.ts" -o -name "*.tsx" -o -name "*.py" | xargs wc -l | sort -nr`

- Full check: `npm --prefix electron run lint && npm --prefix electron run typecheck && .venv/bin/pytest -q`

These checks are advisory; required validation commands are mandatory.

## PR Checklist (Copy/Paste)

- [ ] Complexity < 10 for every new/modified function.
- [ ] File size policy met (<100 lines for 90% of files, <200 for all files).
- [ ] No ternaries introduced.
- [ ] No magic numbers introduced.
- [ ] Lint/typecheck/tests passed for touched areas.
- [ ] Tests added/updated for behavior changes.
- [ ] Docs updated for behavior/config/API changes.
