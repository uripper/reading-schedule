# Reading Plan Optimizer

Create daily reading schedules from backlog + time budget.

## Features
- Greedy baseline planner and MIP planner (OR-Tools optional)
- Book/session/day constraints and completion-aware scheduling
- Electron GUI with tabs (Settings, Books, Schedule)
- Calendar schedule view (not a raw table)
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
UI_SCALE=1.65 npm run start
```

## GUI (Install/Run On Native Windows From WSL)
```bash
./scripts/run_windows_gui_from_wsl.sh
```
This calls `scripts/install_and_run_windows.ps1`, mirrors the repo to `%LOCALAPPDATA%\\ReadingPlanOptimizer`, creates a Windows venv, installs Python deps, installs Electron deps, and launches the GUI.

## Tests
```bash
pytest -q
```
