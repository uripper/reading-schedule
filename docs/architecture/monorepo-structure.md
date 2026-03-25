# Target Monorepo Structure

## Why We Should Restructure

The current repository layout made sense when Electron was the product shell, but
it is now fighting the Tauri migration:

- `electron/` currently owns UI source, desktop host code, static assets, styles,
  scripts, and tests.
- `mobile/` is a second frontend with overlapping product responsibility.
- `apps/bartleby/` is becoming the new host, but the real frontend is still
  trapped inside `electron/`.
- `src/reading_plan/` is a Python package living at the repo root while the rest
  of the repo is organized like a JavaScript monorepo.
- `packages/contracts/` is shared correctly, but its internal structure is still
  shaped by the old app boundaries.

We want one source of truth per concern:

- app hosts are thin
- shared frontend code lives in one place
- shared Rust logic lives in crates
- Python is isolated as a temporary parity oracle
- legacy app shells are visibly temporary

## Target Layout

```text
apps/
  bartleby/
    package.json
    src-tauri/
      Cargo.toml
      src/
        main.rs
        lib.rs
  website/
  electron-legacy/        # temporary during migration
  mobile-legacy/          # temporary during migration

packages/
  frontend/
    package.json
    src/
      bootstrap/
      app/
      features/
      platform/
      styles/
      assets/
    public/
    tests/
  contracts/
    src/
      planner/
      search/
      state/
      view-models/
      shared/
      index.ts
  ui/                     # optional, only if website/app truly share primitives

crates/
  planner-core/
  planner-storage/
  planner-search/
  planner-import/

python/
  reading-plan/
    pyproject.toml
    src/
      reading_plan/
    tests/                 # temporary during Rust parity work

data/
  fixtures/
  samples/

docs/
scripts/
Issues/
```

## Ownership Rules

- `apps/` contains shippable entrypoints only.
- `packages/` contains shared TypeScript or browser-facing code.
- `crates/` contains shared Rust domain and storage logic.
- `python/` contains temporary legacy runtime code used only until the Rust
  port reaches parity.
- `data/` contains checked-in sample data and migration fixtures.

## Recommended Naming Decisions

### Keep `apps/bartleby` as the product shell

This should stay the Tauri host app for desktop and mobile.

### Move the web UI to `packages/frontend`

This is the main structural change.

The shared product UI is not really an app on its own. It is a reusable frontend
package consumed by the Tauri host, and possibly by test harnesses later. That
makes `packages/frontend` a better home than `apps/frontend`.

### Rename old shells to `*-legacy`

When we are ready to move folders:

- `electron/` becomes `apps/electron-legacy/`
- `mobile/` becomes `apps/mobile-legacy/`

That makes ownership obvious and prevents the old shells from still looking like
first-class roots.

### Move Python out of the repo root

`src/reading_plan/` should eventually become:

- `python/reading-plan/src/reading_plan/`
- `python/reading-plan/tests/`

That makes it clear the Python implementation is transitional and not the
long-term home of the app.

## Current-to-Target Mapping

- `electron/renderer/` -> `packages/frontend/src/features/` and `packages/frontend/src/app/`
- `electron/styles/` -> `packages/frontend/src/styles/`
- `electron/assets/` -> `packages/frontend/public/assets/` or `packages/frontend/src/assets/`
- `electron/index.html` -> `packages/frontend/index.html`
- `electron/main/` -> `apps/bartleby/src-tauri/` plus `crates/`
- `mobile/src/` reusable logic -> `packages/frontend/src/features/`
- `src/reading_plan/` -> `crates/` over time, with `python/reading-plan/` kept
  only as a temporary parity oracle
- `packages/contracts/src/types_subfolders/` -> `packages/contracts/src/{planner,search,state,view-models,shared}/`

## Frontend Package Structure

Inside `packages/frontend/src/`, prefer this shape:

```text
src/
  bootstrap/
    install-shell.ts
    start-app.ts
  app/
    routing/
    layout/
    state/
  features/
    today/
    library/
    schedule/
    recommendations/
    stats/
    settings/
    help/
  platform/
    planner-api/
    window/
    storage/
  styles/
  assets/
```

Notes:

- `platform/` is where Tauri-specific adapters live.
- `features/` is where product modules live, independent of Electron or mobile.
- `app/` holds shared shell concerns like layout, tabs, routing, and runtime
  composition.
- `bootstrap/` stays very small and only wires the app together.

## Rust Structure

Keep the Tauri app thin and move reusable Rust logic into crates as it grows:

- `planner-core/` for scheduling logic
- `planner-storage/` for SQLite and state persistence
- `planner-search/` for local/remote lookup normalization
- `planner-import/` for Electron state import and migration

`apps/bartleby/src-tauri/` should mostly be command registration and app wiring.

## Python End State

Python is not part of the intended final architecture.

The plan is:

1. port planner, state, search, and import logic into Rust crates
2. keep `python/reading-plan/` only while we compare outputs and recover from gaps
3. remove the Python runtime from the shipped product once Rust reaches parity

## Current Tauri Runtime

Today, `apps/bartleby/` runs planning natively from the Tauri Rust command
layer using a Rust greedy planner for `plan_generate`, local sample payloads
for `plan_sample`, and a native SQLite primary store with JSON compatibility
fallback for saved state.

That removes the Tauri runtime dependency on Python for planning and local
state persistence, but the migration is still intermediate overall because
import, richer persistence behavior, and broader shared domain logic still need
to move into reusable Rust crates.

The current parity baseline is:

1. planner profiles are routed natively in Rust, with fast-mode greedy behavior
   and staged-profile fallback metadata matching what the shared frontend expects
2. saved-state loading prefers the Tauri canonical store, but desktop builds
   also probe the legacy Electron `reading-plan-gui` data directory and migrate
   recoverable state forward into the Tauri store
3. cover download and upload validation now follows the stricter Electron-era
   host, redirect, size, and image-signature rules
4. desktop recovery is available through the Tauri host via the
   `state:recover:app` wrapper and the app-local Rust recovery binary

## Migration Order

These are the no-regret moves:

1. Create `packages/frontend/` and move the shared web UI there.
2. Keep `apps/bartleby/` as the Tauri host that points at that frontend.
3. Continue shrinking `electron/` down to legacy desktop-shell responsibilities.
4. Move Python into `python/reading-plan/` as an explicitly temporary parity harness.
5. Extract Rust crates as planner, storage, search, and import logic are ported.
6. Rename `electron/` and `mobile/` to `apps/*-legacy/` near cutover, not at the start.
7. Delete `python/reading-plan/` after Rust parity closes the remaining gaps.

## What We Should Not Do

- Do not create another full app root just for the shared UI.
- Do not keep long-term frontend source inside `electron/`.
- Do not put shared web code into `apps/bartleby/src/` if it should also be testable
  or reusable outside the Tauri shell.
- Do not move Python and Electron legacy folders at the same time as feature
  migration work. Separate structure changes from behavior-heavy changes.

## Immediate Recommendation

Before more Tauri feature work, the next structural move should be:

1. keep `apps/bartleby/` as the Tauri host
2. create `packages/frontend/`
3. move the shared HTML, styles, assets, and renderer modules out of `electron/`
4. leave `electron/main/` in place until the desktop host is fully replaced

That gives us a clean split:

- `apps/bartleby` owns native hosting
- `packages/frontend` owns the product UI
- `packages/contracts` owns shared TypeScript contracts
- `crates/*` will own native logic as the Rust port lands
