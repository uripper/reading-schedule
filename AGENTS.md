# AGENTS.md

Guidance for coding agents working in this repository.

NEVER TOUCH THE README.md. IF YOU WANT TO SUGGEST TO ADD TO IT, MENTION IT IN
A CHAT! NEVER TOUCH THE README.md!!!!

## 1) Project Snapshot

- Product: Bartleby reading scheduler.
- Desktop host: Tauri app in `apps/bartleby/`.
- Shared web frontend source of truth: `packages/frontend/`.
- Planner, search, storage, and cover runtime source of truth: Rust crate in `apps/bartleby/src-tauri/`.
- Tests:
  - Shared frontend: `packages/frontend/tests/`
  - Native desktop/runtime: `apps/bartleby/src-tauri/` unit tests

## 2) High-Value Paths

- `apps/bartleby/src-tauri/src/`: native planner, search, cover, state, and recovery logic.
- `apps/bartleby/src/`: desktop host bootstrap and Tauri adapter wiring.
- `packages/frontend/`: shared UI/runtime logic by feature area.
- `scripts/`: style audit, issue sync, Windows helper scripts.
- `STYLEGUIDE.md`: non-negotiable engineering rules (must follow).
- `Issues/`: issue catalog synced to GitHub with `scripts/sync_issues.sh` (`Open/` and `Closed/`).

## 3) Working Rules (Non-Negotiable)

These are enforced standards from `STYLEGUIDE.md`.

- Keep function complexity under 10.
- Keep files under 300 lines (hard limit).
- Keep at least 90% of files under 200 lines.
- Do not use ternary operators.
- Do not use magic numbers; extract named constants.
- Do not introduce implicit `any` in TypeScript.
- Always use braces for `if/else/for/while`.
- One statement per line.
- Prefer early returns over nested branches.
- Do not declare functions inside blocks.
- Keep object shorthand properties contiguous (top or bottom of object literal).
- Avoid circular dependencies.

## 4) TypeScript / Sonar Rules

- Treat lint/Sonar findings in touched files as merge blockers.
- Default to `packages/contracts` for shared TypeScript types and inference-backed contract shapes; do not duplicate or re-derive cross-application contracts in app-local folders.
- If a type could reasonably be shared by another application without pulling in app-specific runtime dependencies, move it into `packages/contracts` now instead of waiting for a second consumer.
- Do not commit `console.error`, `console.warn`, `console.log`, or `console.debug`.
- Allowed console methods only: `assert`, `clear`, `count`, `group`, `groupCollapsed`, `groupEnd`, `info`, `table`, `time`, `timeEnd`, `trace`.
- Do not use `void` to suppress Promise handling. Use `await` or explicit `.catch(...)`.
- Prefer optional chaining when equivalent.
- Prefer `??=` for defaulting assignments when equivalent.
- Do not chain mutating `.sort()` inside expressions.
- Always provide compare callbacks for alphabetical string sorting (`localeCompare`).
- Avoid implicit object-to-string coercion on unknown values.
- Remove redundant type assertions.
- Prefer `globalThis` over `window` for global APIs.

## 5) Error Handling and Runtime Safety

- Validate external input at boundaries.
- Fail fast on invalid state with actionable messages.
- Do not swallow exceptions silently.
- In `catch`, either recover with context or rethrow with context.
- Prefer user-visible recovery/status paths over console output in renderer code.

## 6) Tests and Validation (Required)

Run commands relevant to touched areas before finishing:

- Desktop:
  - `pnpm run lint:desktop`
  - `pnpm run typecheck:desktop`
  - `pnpm run build:desktop`
  - `pnpm run test:desktop`
  - `cargo clippy --manifest-path apps/bartleby/src-tauri/Cargo.toml -- -D warnings`

Helpful aggregate checks:

- Style audit: `pnpm run styleaudit`
- Repo desktop dev entrypoint: `pnpm run dev:desktop`
- Root desktop wrappers:
  - `pnpm run lint:desktop`
  - `pnpm run typecheck:desktop`
  - `pnpm run build:desktop`
  - `pnpm run test:desktop`

For broad refactors or project-wide cleanup work, run these repo-level checks by default unless the user explicitly asks you not to:

- `pnpm run styleaudit`
- `pnpm run lint:desktop`

If a required command fails, the change is not done.

## 7) Documentation and Change Scope

- Keep changes focused; avoid mixing unrelated refactors with behavior changes.
- Add/adjust tests for new behavior and bug fixes (regression tests when practical).
- Update docs in the same change when behavior, command, config, or contract changes.
- When introducing or changing a shared or potentially reusable contract, update `packages/contracts` first and treat app-local copies as a design smell unless the type is transient implementation state or depends on app-specific runtime libraries.
- For UI changes, include screenshots in PR/hand-off notes when applicable.
- If you add new tooling checks, wire them into required commands in the same change.

## 8) Sonar / Config Consistency

- Keep Sonar project key consistent:
  - `sonar-project.properties` `sonar.projectKey`
  - `.vscode/settings.json` `sonarlint.connectedMode.project.projectKey`
- Keep scanner scope entries current when adding roots/tsconfig files:
  - `sonar.sources`
  - `sonar.exclusions`
  - `sonar.typescript.tsconfigPaths`
- Use `sonar.token` auth; do not add deprecated `sonar.login` usage.

## 9) Completion Checklist

Before handing work back:

- Required validation commands for touched areas pass.
- No MUST-rule violations introduced.
- Tests updated for behavior changes.
- Docs updated for behavior/config/API/command changes.
- Change intent is clear without reverse-engineering.
