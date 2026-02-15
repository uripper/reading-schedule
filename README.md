# Reading Plan Optimizer

Create daily reading schedules from backlog + time budget.

## Features
- Greedy baseline planner and MIP planner (OR-Tools optional)
- Book/session/day constraints
- Exact finish reporting (last session trimmed to remaining words)
- CLI and Electron GUI

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

## GUI (Electron)
```bash
cd electron
npm install
npm run start
```

Notes:
- The GUI sends JSON payloads to Python (`python -m reading_plan.gui_api`), so you no longer edit CSV by hand.
- If Python is not on PATH, set `PYTHON_BIN` before starting Electron.

## Input Model
- Books: `book_id`, `title`, `words_total`, `priority`, `difficulty`, optional `deadline`, optional `min_blocks_per_session`
- Settings: dates, minute budget, limits, objective weights, difficulty multiplier map

## Tests
```bash
pytest -q
```
