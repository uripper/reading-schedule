# Reading Plan Optimizer

Create daily reading schedules from backlog + time budget.

## Features
- Greedy baseline planner and MIP planner (OR-Tools optional)
- Book/session/day constraints and completion-aware scheduling
- Priority: `1` highest, `5` lowest
- Electron GUI with tabs (Today, Sessions, Settings, Books, Schedule)
- Calendar schedule view (not a raw table)
- Session timer + manual session logging with local persistence
- Daily goal, streak widget (feature-flagged), and theme/reduced-motion preferences
- Open Library title lookup autofills estimated words
- Per-book progress fields (`progress_percent`, `words_read`, `pages_read`)
- Per-book hard cap field (`max_minutes_per_day`)
- Hidden/internal book IDs (UUID fallback)
- Help/Logs dialog for run details and warnings

## Python Setup
```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
# optional MIP solver
pip install -e ".[mip]"
```

## CLI
```bash
python -m reading_plan.cli --data data/books.csv --settings data/settings.json --output data/schedule.csv --planner mip
```

## GUI (WSL/Linux)
```bash
cd electron
npm install
npm run tokens:build
UI_SCALE=1.65 npm run start
```

## GUI (Install/Run On Native Windows From WSL)
```bash
./scripts/run_windows_gui_from_wsl.sh
```
This calls `scripts/install_and_run_windows.ps1`, mirrors the repo to `%LOCALAPPDATA%\\ReadingPlanOptimizer`, creates a Windows venv, installs Python deps, installs Electron deps, and launches the GUI.

## Tests
```bash
.venv/bin/pytest -q
cd electron && npm run lint
```

## Design Tokens
```bash
cd electron
npm run tokens:build
npm run tokens:check
```

Token source is `electron/tokens/dtcg.tokens.json`. Build output is written to:
- `electron/styles/generated/tokens.css`
- `electron/tokens/dist/tokens.ts`
