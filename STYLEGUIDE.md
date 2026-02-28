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
- Keep files under 200 lines in at least 90% of cases.
- Keep files under 300 lines in 100% of cases; split files when necessary.
- Do not use ternaries.
- Do not use magic numbers.
- Do not introduce implicit `any` in TypeScript.
- TypeScript must be configured via `tsconfig.json` (not ad hoc CLI flags) for repository code.
- TypeScript `strict` mode is required for repository TypeScript projects unless an exception is approved.
- `noImplicitAny` and `strictNullChecks` must remain enabled in all primary project tsconfig files.
- Always perform lint checks.
- Always run required type checks for all languages; zero type errors is mandatory.
- Python type errors must be resolved using `ty check` before merge.

## Merge Blockers

A PR must not merge if any of the following is true:

- Any MUST rule is violated.
- Any required lint/typecheck/test command fails.
- Any typecheck error exists in touched areas.
- Any `tsconfig` change weakens type safety (`strict`, `noImplicitAny`, `strictNullChecks`) without an approved exception.
- A behavior change is missing tests.
- A contract/config change is missing docs.

## Code Rules

### Function Design

- One function should do one job.
- Use early returns instead of deep nesting.
- Keep function bodies small and extract helpers when branching grows.
- Do not declare functions inside blocks.
- Group all shorthand properties together at the beginning or end of object declarations.
- For functions with multiple return branches (especially discriminated unions), prefer an explicit return type annotation.
- For APIs/callbacks where `this` is part of the contract, type `this` explicitly in the callback signature.

### File and Module Design

- Prefer many small focused modules over large mixed-purpose files.
- Split by responsibility, not by arbitrary type groupings.
- Avoid circular dependencies.
- For feature directories (for example under `electron/renderer/app/*`), expose cross-feature APIs through a local `index.ts` barrel and prefer importing from that barrel instead of deep relative file paths.
- Keep feature module naming predictable by role when practical (for example `model`, `ui`, `bindings`, `availability`, `schedule_completions`) instead of mixed naming styles.
- Export all named types that appear in public APIs (parameters, return types, exported object shapes). Do not rely on private/local-only named types leaking into emitted declarations.

### Control Flow and Readability

- Always use braces for `if`, `else`, `for`, and `while`.
- Keep one statement per line.
- Do not use ternaries (`condition ? a : b`).
- Prefer explicit `if`/`else` branches.
- Exhaustive handling is required for discriminated unions in `switch` statements (use a `never` check / `assertUnreachable` pattern).

### Constants and Numbers

- Replace non-trivial numeric literals with named constants.
- Constant names must be domain-semantic and include units when relevant (`MS_PER_SECOND`, `MAX_RESULTS`).
- Keep constants close to their usage scope unless shared.

### Naming

- Use descriptive names, not unexplained abbreviations.
- Include units in variable names (`durationMs`, `minutesPerDay`).
- Use clear boolean names (`isComplete`, `hasDeadline`, `canPersist`).
- Name types using the language of the problem domain, not implementation details.

### Type Design (TypeScript)

- Prefer types that always represent valid states. Model state transitions explicitly instead of allowing impossible combinations.
- Push `null`/`undefined` values to the perimeter of your types and APIs. Avoid spreading nullable values deeply through internal domain models.
- Prefer unions of interfaces to interfaces with union-typed fields for stateful/domain modeling.
- Limit the use of optional properties. Do not use large "option bags" as a substitute for explicit state modeling.
- Prefer more precise alternatives to broad string types for constrained values (literal unions, template literal types, branded/distinct types when justified).
- Use `Record<...>` for exhaustive key-to-value mappings (labels, status renderers, config maps) when the keyspace is known and should stay in sync.
- Prefer `interface` for object-shaped types when either `type` or `interface` would work; use `type` when you need unions/intersections/tuples/aliases or when it is more ergonomic.

### Runtime and Platform Safety

- Prefer `globalThis` over `window` for global APIs.
- Do not cast `globalThis` to `Window`; type only the specific global members you need.
- Validate external input at boundaries.
- Fail fast on invalid state with actionable messages.
- Treat values from untyped/external sources as `unknown` until validated/narrowed.
- Use `readonly` on parameters, properties, and arrays when mutation is not intended (especially function parameters and shared state inputs). Note: `readonly` is shallow; use deeper strategies when needed.

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
- Prefer type annotations to type assertions.
- Type assertions are not a substitute for type checking and must not be used to suppress legitimate errors.
- If a type assertion is unavoidable, hide it inside a small well-typed helper function so callers remain assertion-free.
- Minimize `any`:
  - If `any` is unavoidable, keep its scope as narrow as possible (small expression/helper, not broad variables/parameters).
  - Prefer more precise variants of `any` over plain `any` where interoperability requires it.
  - Prefer `unknown` over `any` when the value’s type is genuinely unknown.
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
  - Type assertions (`as Type`, angle-bracket assertions, and non-null assertions `!`) require an immediately preceding comment that justifies why the assertion is necessary and why narrowing could not be expressed safely otherwise.

## Testing and Verification

- New behavior requires tests.
- Bug fixes require regression tests when practical.
- Refactors must keep behavior stable and tests green.
- If behavior changes intentionally, update tests and docs in the same change.
- Type checking and unit tests are complementary. Types do not replace behavior tests, and tests do not replace static guarantees.

## Tooling Baseline

- IDE-only diagnostics are advisory unless they map to required validation commands.
- Keep analyzer scope aligned with real commands. Do not enable file patterns in config that are not validated in CI/local required commands.
- Electron main-process TypeScript is enforced by `tsc` (`npm --prefix electron run typecheck`), not by ESLint parsing.
- `electron/tsconfig.main.json` must include all main-process entry files via wildcard patterns (for example `*.ts`) instead of hand-maintained per-file include lists.
- `npm run audit` measures code lines after removing blank/comment lines, reports files under 20 lines as combination candidates, reports `interface`/`type` declarations outside `types/` directories, and detects ternaries via AST `ConditionalExpression` nodes.
- If you add a new checker or rule set, wire it into a required command in this guide in the same change.
- After changing lint/parser config, run the target command once on representative files and confirm there are no parser crashes.
- Prefer ECMAScript runtime features over TypeScript-only language features when both solve the problem and the runtime target supports the ECMAScript version.
- Track repository type coverage and prevent regressions (for example via `type-coverage` in CI/local validation).
- Enable and enforce exhaustiveness checking in lint (`@typescript-eslint/switch-exhaustiveness-check`) in TypeScript code that uses discriminated unions.

## Documentation Policy

- Update docs in the same PR when changing user-visible behavior.
- Update docs in the same PR when changing commands or scripts.
- Update docs in the same PR when changing configuration formats.
- Update docs in the same PR when changing API contracts.

### Code Documentation

Documentation is required in both Python and TypeScript. The following must be documented:

- **Modules**: Every module must have a top-level docstring (Python) or a TSDoc/JSDoc block comment (TypeScript) describing its purpose and responsibility.
- **Classes**: Every class must have a docstring or TSDoc comment explaining what it represents and its invariants.
- **Functions**: Every non-trivial function must have a docstring or TSDoc comment describing behavior and intent. Do not duplicate type information that already exists in TypeScript signatures.
- **Hard-to-determine logic**: Any block of code whose intent is not immediately clear must have a comment explaining the why, not just the what.

Write comments for intent and constraints, not obvious mechanics.

Line comments must always appear on the line immediately above the code they describe. Do not write inline end-of-line comments.

### TSDoc Rules (TypeScript)

- Use TSDoc-style comments for exported/public TypeScript APIs.
- Keep comments short and to the point; avoid long prose when a concise description will do.
- Do not use JSDoc type syntax (`@param {string} ...`) in TypeScript files; rely on TypeScript signatures as the source of truth.
- Use `@deprecated` on deprecated APIs so editor tooling surfaces deprecation status clearly.

## Required Validation Commands

Run all commands relevant to touched areas before merge.

### Electron

- `npm --prefix electron run lint`
- `npm --prefix electron run typecheck`
- `npm --prefix electron run build`

### Python Planner

- `npm run lint:python`
- `.venv/bin/pytest -q`

### Type Safety (TypeScript)

- `npm run type-coverage` (or equivalent command) must not regress coverage from main.

If any required command fails, do not merge.

## PR Checklist (Copy/Paste)

- [ ] Complexity < 10 for every new/modified function.
- [ ] File size policy met (<150 lines for 90% of files, <200 for all files, >30 lines for 90% of files).
- [ ] No ternaries introduced.
- [ ] No magic numbers introduced.
- [ ] TypeScript uses repo `tsconfig` settings (`strict`, `noImplicitAny`, `strictNullChecks` intact).
- [ ] `any` usage is justified, minimized in scope, and not replaceable with `unknown`.
- [ ] Discriminated unions are exhaustively handled (`never`/`assertUnreachable` or lint-enforced exhaustiveness).
- [ ] Every type assertion has an immediately preceding justification comment.
- [ ] Lint/typecheck/tests passed for touched areas.
- [ ] Type coverage did not regress (when TypeScript touched).
- [ ] Tests added/updated for behavior changes.
- [ ] Docs updated for behavior/config/API changes.
