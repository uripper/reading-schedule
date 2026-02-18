# Bartleby

Create daily reading schedules from backlog + time budget.

## Current Status
This repository now contains both:
- `electron/`: legacy desktop app (kept operational during migration)
- new cross-platform workspace scaffold for web + desktop + mobile:
  - `apps/client` (React + TypeScript SPA)
  - `apps/desktop` (Electron shell in TypeScript)
  - `apps/mobile` (Capacitor wrapper)
  - `packages/contracts` (Zod schemas + adapter interfaces)
  - `packages/ui` (shared tokenized UI primitives)
  - `services/planner-api` (FastAPI wrapper around `src/reading_plan`)

## Python Planner Core
The planner engine remains under `src/reading_plan` and is still the source of truth.

### Setup
```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
pip install -e ".[dev]"
# optional MIP solver
pip install -e ".[mip]"
```

### CLI
```bash
python -m reading_plan.cli --data data/books.csv --settings data/settings.json --output data/schedule.csv --planner mip
```

## Legacy Electron App (still supported)
```bash
cd electron
npm install
npm run tokens:build
UI_SCALE=1.65 npm run start
```

## New Workspace (pnpm)
```bash
pnpm install
pnpm -r typecheck
pnpm -r test
```

### Client SPA
```bash
pnpm --filter @reading-schedule/client dev
```

### Desktop TS Shell
```bash
pnpm --filter @reading-schedule/desktop dev
```

Use Vite during desktop development:
```bash
CLIENT_DEV_URL=http://localhost:5173 pnpm --filter @reading-schedule/desktop dev
```

### Mobile Wrapper
```bash
pnpm --filter @reading-schedule/mobile sync
pnpm --filter @reading-schedule/mobile open:ios
pnpm --filter @reading-schedule/mobile open:android
```

### Planner API
```bash
cd services/planner-api
python -m venv .venv
source .venv/bin/activate
pip install -e .
PYTHONPATH=../../src python -m planner_api
```

## Tests
```bash
.venv/bin/pytest -q
cd electron && npm run lint
```

## Design Tokens (legacy electron)
```bash
cd electron
npm run tokens:build
npm run tokens:check
```

Token source: `electron/tokens/dtcg.tokens.json`
