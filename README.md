# Bartleby

Create daily reading schedules from backlog + time budget.

## Current Status

This repository now contains both:

- `electron/`: desktop app runtime with the current full feature set
- new cross-platform workspace scaffold for web + desktop + mobile:
  - `apps/client` (React + TypeScript SPA)
  - `apps/desktop` (migration shell in TypeScript)
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

## Desktop App (primary runtime)

From repo root:

```bash
npm run dev:desktop
```

Directly from `electron/`:

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

### Desktop TS Shell (migration scaffold; not feature-parity with `electron/`)

```bash
npm run dev:desktop:shell
```

Use Vite during desktop development:

```bash
CLIENT_DEV_URL=http://localhost:5173 npm run dev:desktop:shell
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

## SonarQube Full Scan

Run repository-wide analysis (with generated/dependency folders excluded via `sonar-project.properties`):

```bash
SONAR_HOST_URL="https://your-sonarqube-server" SONAR_TOKEN="sqp_xxx" npm run sonar:scan
```

You can also override project identity per run:

```bash
SONAR_HOST_URL="https://your-sonarqube-server" SONAR_TOKEN="sqp_xxx" npm run sonar:scan -- -Dsonar.projectKey=your-key -Dsonar.projectName="Your Project"
```

## Design Tokens (legacy electron)

```bash
cd electron
npm run tokens:build
npm run tokens:check
```

Token source: `electron/tokens/dtcg.tokens.json`
