# Reading Plan Optimizer — MVP Roadmap (Python)

## Product goal
Turn a user’s backlog + time budget into a **daily reading schedule** that:
- respects days off and a date horizon
- limits simultaneous books
- allocates time by book “weight”
- outputs a plan that is **human-usable** (not 6 minutes on 9 books)

Non-goal (for MVP): perfect realism (variable WPM by genre/language, habit modeling, etc.)

---

## Core MVP decisions (lock these in)
- **Unit:** minutes/day (not pages). Convert book size to required minutes via WPM.
- **Granularity:** 15-minute blocks (`time_quantum=15`) to avoid fractional nonsense.
- **Sessions:** at most `max_sessions_per_day` (default 2).
- **Simultaneous books definition:** *per day* cap (`max_books_per_day`), simplest and intuitive.
- **Book progress model:** continuous progress in words (derived from minutes * WPM * difficulty_multiplier).

---

## Inputs (MVP)
### Global settings
- `start_date`, `end_date`
- `minutes_per_day` (constant) OR `minutes_by_weekday` (Mon..Sun)
- `days_off` (set of dates)
- `wpm_base` (single number, e.g., 250)
- `time_quantum_minutes` (default 15)
- `max_sessions_per_day` (default 2)
- `max_books_per_day` (default 2)
- Objective weights:
  - `w_finish` (prioritize finishing books)
  - `w_priority` (prioritize high-priority books)
  - `w_switch` (penalize reading many distinct books per day)
  - `w_smooth` (avoid difficulty spikes day-to-day)

### Per-book fields (CSV/JSON)
- `book_id`
- `title`
- `words_full` (or `pages_total` with a fixed conversion you document)
- `priority` (1–5)
- `difficulty` (1–5)
- optional:
  - `deadline` (date)
  - `min_blocks_per_session` (default 2 => 30 min)

### Difficulty multiplier (simple, not “overengineered”)
Use one global map (editable):
- 1 → 1.00
- 2 → 0.90
- 3 → 0.80
- 4 → 0.70
- 5 → 0.60

Effective WPM = `wpm_base * difficulty_multiplier[difficulty]`

---

## Outputs (MVP)
- Daily schedule table:
  - date, session_index, book_id/title, minutes, words_planned
- Summary:
  - total planned minutes, per-book planned words, projected completion status
  - feasibility warning if total required minutes > available minutes

Export formats:
- console print + CSV output file (MVP)
- (Later) ICS calendar export, Obsidian markdown

---

## Architecture (repo layout)
reading-plan-optimizer/
- README.md
- pyproject.toml
- data/
  - books.csv
  - settings.json
- src/reading_plan/
  - __init__.py
  - io.py            # load/save csv/json
  - model.py         # build optimization model
  - solve.py         # solver interface + status parsing
  - schedule.py      # convert solution -> human schedule rows
  - report.py        # feasibility + summary metrics
  - cli.py           # entrypoint
- tests/
  - test_io.py
  - test_schedule.py
  - test_feasibility.py

---

## Roadmap (incremental milestones)

### Milestone 0 — Skeleton + data contracts (0.5 day)
- Create repo + packaging (uv/poetry/pip)
- Define `books.csv` and `settings.json` schemas
- Implement `io.py` to load/validate inputs
- Add a tiny example dataset (3 books, 14-day horizon)

**Exit criteria**
- `python -m reading_plan.cli --data data/books.csv --settings data/settings.json` runs and prints parsed inputs

---

### Milestone 1 — Greedy baseline planner (1 day)
Implement a *non-optimization* baseline that:
- computes available minutes per day
- assigns blocks to books by priority (and/or weights)
- respects `max_books_per_day`, `max_sessions_per_day`, `min_blocks_per_session`
- tracks progress in words

Why: gives you working product + reference to test solver outputs.

**Exit criteria**
- Generates a schedule CSV
- Produces per-book progress totals
- No day exceeds minute budget; no day exceeds max books/sessions

---

### Milestone 2 — MIP optimizer v1 (1–2 days)
Use Pyomo (or OR-Tools CP-SAT; pick one and stick to it).

**Decision variables**
- `x[b,d]` = integer blocks of 15 minutes assigned to book b on day d
- `y[b,d]` = binary, 1 if book b is read on day d

**Constraints**
- Daily time budget: `sum_b x[b,d] * q <= minutes_available[d]`
- Link: `x[b,d] <= M * y[b,d]`
- Max books/day: `sum_b y[b,d] <= max_books_per_day`
- Sessions/day approximation: `sum_b y[b,d] <= max_sessions_per_day` (MVP simplification)
- Min session length: `x[b,d] >= min_blocks * y[b,d]`
- Optional deadlines:
  - define cumulative progress and require completion by deadline (hard) OR penalize lateness (soft)

**Objective (linear, MVP-friendly)**
Maximize:
- `w_priority * sum_{b,d} (priority_b * words_per_block_b * x[b,d])`
- `w_finish * sum_b finished_b` (optional binary finished variable)
Minus:
- `w_switch * sum_{b,d} y[b,d]`

(Leave smoothing for Milestone 3 if it complicates linearization.)

**Exit criteria**
- Optimizer produces a schedule that beats greedy on your chosen metric (e.g., higher priority-weighted words)
- Handles infeasible deadlines by reporting solver status clearly

---

### Milestone 3 — Add “finish” and “don’t-cram” realism (1–2 days)
Add:
- `finished_b` binary
- Completion constraint:
  - `sum_d words_per_block_b * x[b,d] >= words_total_b * finished_b`
- Objective includes finishing reward:
  - `+ w_finish * sum_b (priority_b * finished_b)`

Add anti-cram constraint (simple):
- `x[b,d] <= max_blocks_per_book_per_day` (e.g., 12 blocks = 3 hours)

**Exit criteria**
- Schedule produces sensible completion behavior (finishes books rather than spreading thin forever)

---

### Milestone 4 — Difficulty smoothing (optional, 1–2 days)
Compute daily “difficulty load”:
- `load[d] = sum_b difficulty_b * x[b,d]` (linear)

Add smoothing via absolute deviation:
- introduce `delta[d] >= load[d] - load[d-1]`
- `delta[d] >= load[d-1] - load[d]`
- penalize `sum_d delta[d]` with weight `w_smooth`

**Exit criteria**
- Schedules avoid large day-to-day swings when the weight is high

---

### Milestone 5 — Replanning loop + logging (optional, 2–4 days)
- Add `progress.csv` where user logs actual minutes/words
- Re-solve from “today” with remaining words
- Keep already-completed books locked out

**Exit criteria**
- `--replan` reads progress and outputs updated schedule forward

---

## Quality bar (keep it hireable)
- Determinism: set solver seed where possible
- Clear solver reporting:
  - optimal / feasible / infeasible
  - objective value + key constraint violations (should be none)
- A README demo gif or screenshot (even CLI output is fine)
- Tests around:
  - day budget respected
  - max books/day respected
  - min session enforced
  - progress accumulation correct

---

## MVP timeline suggestion (pragmatic)
- Day 1: Milestone 0 + 1 (working greedy planner)
- Day 2–3: Milestone 2 (optimizer v1)
- Day 4: Milestone 3 (finish + anti-cram) + polish README

---

## Minimal README checklist (what reviewers look for)
- Problem statement + inputs/outputs
- One command to run demo
- Explanation of constraints + objective in plain English
- Example schedule output
- Notes on extensibility (deadlines, languages, UI) without building them yet
