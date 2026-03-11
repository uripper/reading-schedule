# ISSUE-096: Document target support ownership and contribution workflow

**Type:** tech-debt
**Priority:** P2
**Labels:** `tech-debt`, `docs`, `process`

Problem:

The README covers setup and usage, but the repository does not currently define a contribution guide, target ownership, or a support matrix for desktop, mobile, and web. This is especially unclear because the mobile app exposes `dev:web`, while the top-level docs describe desktop and mobile as the primary runtimes.

Expected:

Contributors should be able to tell which targets are supported, who owns them, where the boundaries are between planner core, contracts, main process, renderer, and mobile, and how to contribute safely.

Definition of done:

- Add `CONTRIBUTING.md` with setup, validation, branch, and review expectations.
- Add `CODEOWNERS` or an equivalent ownership document.
- Document support status for desktop, mobile, and web.
- Document boundaries between `src/reading_plan`, `packages/contracts`, `electron/`, and `mobile/`.
- Link the above from `README.md`.

Context:

- `README.md`
- `AGENTS.md`
- `mobile/package.json`
- `electron/`
- `mobile/`
- `packages/contracts/`
- `src/reading_plan/`

