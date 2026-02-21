# ISSUE-001: Missing sample books file breaks sample mode


**Type:** bug  
**Priority:** P0  
**Labels:** `bug`, `planner`, `desktop`

Problem:

Default sample-mode commands reference `data/books.csv`, but that file is missing in the repository.

Repro:

1. Run `.venv/bin/python -m reading_plan.gui_api --sample --data data/books.csv --settings data/settings.json`.
2. Observe `{"ok": false, "error": "[Errno 2] No such file or directory: 'data/books.csv'"}`.

Expected:

Sample mode should work on a fresh clone without manual file creation.

Definition of done:

- Add committed sample data file (recommended `data/books.sample.csv`).
- Update defaults in CLI/GUI bridge and docs.
- Add tests for default/sample load path.

Context:

- `src/reading_plan/gui_api.py`
- `src/reading_plan/cli.py`
- `README.md`

