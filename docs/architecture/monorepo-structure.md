# Current Monorepo Structure

## Active Runtime

The live desktop product is now organized around three primary roots:

- `apps/bartleby/` is the only desktop host.
- `packages/frontend/` is the shared desktop UI source of truth.
- `apps/bartleby/src-tauri/` is the native Rust runtime for planner, state,
  cover handling, migration, and desktop shell behavior.

The migration goal is no longer “move frontend out of Electron.” That split is
already done for the shipped desktop flow. The remaining work is final semantic
parity validation for the native planner and then deleting the legacy Electron
and Python trees once they are no longer needed as reference oracles.

## Live Layout

```text
apps/
  bartleby/
    index.html
    package.json
    scripts/
    src/
      main.ts
      runtime/
    src-tauri/
      Cargo.toml
      src/
        app_paths.rs
        book_search/
        cover_store/
        native_planner/
        state_store/
        window_zoom.rs
  website/

packages/
  contracts/
    src/
  frontend/
    index.html
    package.json
    scripts/
    src/
    styles/
    tests/
    tokens/

mobile/
scripts/
docs/
Issues/
```

## Ownership Rules

- `apps/` contains shippable entrypoints and thin host wiring.
- `packages/frontend/` owns shared HTML, CSS, assets, browser runtime code, and
  shared frontend tests.
- `packages/contracts/` owns cross-application TypeScript contracts.
- `apps/bartleby/src-tauri/` owns the native desktop runtime and parity-facing
  migration logic.
- `scripts/` owns repo-wide validation and maintenance tooling.

## Desktop Boot Flow

Desktop startup now works like this:

1. `apps/bartleby/src/main.ts` installs the Tauri `PlannerApi` adapter.
2. The Tauri shell imports `packages/frontend/styles.css`.
3. The Tauri shell dynamically imports `packages/frontend/src/renderer/app.ts`.
4. `apps/bartleby/index.html` is generated from `packages/frontend/index.html`
   so the host and shared frontend stay in sync.

This means the desktop app no longer loads Electron-built renderer bundles or
raw Electron-owned assets at runtime.

## Native Runtime

The Tauri Rust side now owns the active desktop backend responsibilities:

- planner request parsing and solver-profile routing
- native planner execution
- saved-state load/save, migration, backup recovery, and journal replay
- legacy Electron user-data import on desktop
- cover download/import validation and storage normalization
- desktop zoom controls
- desktop recovery CLI

`apps/bartleby/src-tauri/` is still a single crate today, but the modules are
already separated by responsibility so they can be extracted later if shared
Rust crates become necessary.

## Validation Entry Points

These root commands are the stable desktop workflow:

- `pnpm run dev:desktop`
- `pnpm run build:desktop`
- `pnpm run lint:desktop`
- `pnpm run typecheck:desktop`
- `pnpm run test:desktop`
- `pnpm run dist:desktop`

They already work without the legacy trees participating in the live desktop
build graph.

## Legacy Status

Legacy directories may still exist in the repository during the cutover window,
but they are no longer intended to be part of the live desktop build graph.

- `electron/` should be treated as migration residue, not an active app root.
- `src/reading_plan/` should be treated as a planner-behavior reference only
  until the last semantic parity checks are complete.

Any new desktop behavior, bug fix, styling change, or tooling update should be
implemented in `apps/bartleby/`, `packages/frontend/`, or
`apps/bartleby/src-tauri/` rather than extending the legacy trees.
