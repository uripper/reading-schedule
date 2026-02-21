# Bartleby

Create daily reading schedules from backlog + time budget.

## Current Status

This repository is now focused on the Electron desktop app.

- Desktop runtime: `electron/`
- Planner engine source of truth: `src/reading_plan`

Legacy cross-platform scaffold directories were removed.

## Python Planner Core

The planner engine remains under `src/reading_plan`.

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

## Desktop App

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

## Windows Install/Run Helper

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install_and_run_windows.ps1 -SourcePath "C:\path\to\reading-schedule"
```

From WSL, use:

```bash
npm run dev:windows
```

Set a specific Python launcher target:

```bash
npm run dev:windows -- 3.11
```

Auto-rebuild + auto-restart on changes (WSL -> Windows sync poll loop):

```bash
npm run dev:windows:hot
```

Set Python and poll interval seconds:

```bash
npm run dev:windows:hot -- 3.11 1
```

This is restart-on-change (not in-window HMR).

## Tests

```bash
.venv/bin/pytest -q
cd electron && npm run lint
```

## Issue Sync (Local -> GitHub)

Sync local issue definitions from `ISSUES.md` into repository Issues:

```bash
npm run issues:sync
```

Preview without writing to GitHub:

```bash
scripts/sync_issues.sh --dry-run --repo OWNER/REPO
```

Duplicate prevention is handled by a stable marker per issue (`Sync-ID: ISSUE-XXX`).
The script searches for that marker and updates matching issues instead of creating new ones.

## SonarQube Full Scan

```bash
SONAR_HOST_URL="https://your-sonarqube-server" SONAR_TOKEN="sqp_xxx" npm run sonar:scan
```

## Design Tokens (Electron)

```bash
cd electron
npm run tokens:build
npm run tokens:check
```

Token source: `electron/tokens/dtcg.tokens.json`
