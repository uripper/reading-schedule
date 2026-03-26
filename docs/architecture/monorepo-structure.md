# Current Monorepo Structure

## Active Runtime

The live desktop product is now organized around three primary roots:

- `apps/bartleby/` is the only desktop host.
- `packages/frontend/` is the shared desktop UI source of truth.
- `apps/bartleby/src-tauri/` is the native Rust runtime for planner, state,
  cover handling, migration, and desktop shell behavior.

The legacy Electron and Python trees have been removed from the live repository
layout. The active desktop product is now fully hosted by the Tauri shell plus
the shared frontend package and the native Rust runtime.

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

They already work with no Electron or Python roots participating in the live
desktop build graph.

## Legacy Compatibility

The only remaining legacy-facing behavior is runtime compatibility for existing
desktop users:

- `apps/bartleby/src-tauri/src/state_store/` can import saved data from the old
  Electron user-data location.
- `apps/bartleby/src-tauri/src/cover_store/` normalizes older cover file paths
  into the canonical Tauri-managed `book_covers/` directory.

Any new desktop behavior, bug fix, styling change, or tooling update belongs in
`apps/bartleby/`, `packages/frontend/`, or `apps/bartleby/src-tauri/`.
