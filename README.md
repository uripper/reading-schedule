# Reading Plan Optimizer (MVP)

Turn a reading backlog + time budget into a daily schedule that is usable in practice.

## What it does
- Plans in minutes/day using 15-minute blocks.
- Respects `days_off`, date horizon, max books/day, and max sessions/day.
- Converts minutes to words using `wpm_base * difficulty_multiplier[difficulty]`.
- Supports:
  - greedy baseline planner
  - MIP planner (OR-Tools CP-SAT, optional dependency)
- Exports a schedule CSV and prints feasibility + progress summary.

## Install
```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
# optional MIP solver
pip install -e ".[mip]"
```

## Demo
```bash
python -m reading_plan.cli --data data/books.csv --settings data/settings.json --output data/schedule.csv --planner mip
```

To run only the baseline planner:
```bash
python -m reading_plan.cli --planner greedy
```

To validate input parsing only:
```bash
python -m reading_plan.cli --print-inputs
```

## Input contracts
`data/books.csv` fields:
- `book_id`, `title`, `priority` (1-5), `difficulty` (1-5)
- `words_total` or `pages_total` (pages converted at 300 words/page)
- optional: `deadline`, `min_blocks_per_session` (default 2)

`data/settings.json` fields:
- `start_date`, `end_date`
- `minutes_per_day` or `minutes_by_weekday` (Mon..Sun)
- `days_off`, `wpm_base`, `time_quantum_minutes`
- `max_sessions_per_day`, `max_books_per_day`
- objective weights: `w_finish`, `w_priority`, `w_switch`, `w_smooth`
- `difficulty_multiplier` map (1..5)

## Constraints (MIP)
- daily budget: `sum x[b,d] * q <= minutes[d]`
- max books/day and sessions/day via `sum y[b,d]`
- linking: `x[b,d] <= M*y[b,d]`
- min session: `x[b,d] >= min_blocks[b]*y[b,d]`
- finish variable: `sum words_per_block[b]*x[b,d] >= words_total[b]*finished[b]`
- optional hard deadline if `deadline` is set for a book

## Output
- CSV columns: `date, session_index, book_id, title, minutes, words_planned`
- CLI summary:
  - planner status and objective
  - total planned/available/required minutes
  - per-book projected completion
  - feasibility warning when required > available

## Testing
```bash
pytest -q
```
