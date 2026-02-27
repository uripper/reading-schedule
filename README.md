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
python -m reading_plan.cli --data data/books.sample.csv --settings data/settings.json --output data/schedule.csv --planner mip
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

Book scheduling supports per-book weekday selection in the Books dialog, with an option to apply the same scheduled days to all books on the same shelf.

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

Hot reload in development mode (TypeScript watch + `electron-reloader`):

```bash
npm run dev:windows:hot
```

Set a specific Python launcher target:

```bash
npm run dev:windows:hot -- 3.11
```

This uses in-process Electron hot reload rather than an external sync/restart poll loop.

## Experience Settings Status

- Shipped and visible: `gamification` toggle.
- Hidden until shipped: reminder controls, social flag, recommendations flag.
- Session activity logging in desktop currently flows through Today/Stats state, and legacy standalone session-tab UI paths were removed.

## Tests

```bash
npm run ci:local
```

Install git hooks so pushes run the same checks automatically:

```bash
npm run hooks:install
```

`npm install` also runs hook setup through the root `prepare` script.

Manual individual commands:

```bash
npm run lint:python
.venv/bin/pytest -q
cd electron && npm run lint
npm run audit
```

## Issue Sync (Local -> GitHub)

Sync local issue definitions from `Issues/Open/*.md` and `Issues/Closed/*.md`
into repository Issues:

```bash
npm run issues:sync
```

Preview without writing to GitHub:

```bash
scripts/sync_issues.sh --dry-run --repo OWNER/REPO
```

Sync from a custom issues root directory:

```bash
scripts/sync_issues.sh --dir path/to/Issues --repo OWNER/REPO
```

Duplicate prevention is handled by a stable marker per issue (`Sync-ID: ISSUE-XXX`).
The script searches for that marker and updates matching issues instead of creating new ones.
Files moved to `Issues/Closed` are synced as closed GitHub issues; files in
`Issues/Open` are synced as open GitHub issues.
The script keeps a local hash cache at `Issues/.sync-cache.tsv` and skips
unchanged issues on subsequent runs.

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
