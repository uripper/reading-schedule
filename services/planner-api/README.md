# Planner API Service

FastAPI wrapper around `src/reading_plan`.

## Endpoints
- `POST /v1/plan/generate`
- `GET /v1/state`
- `PUT /v1/state`
- `GET /v1/books/search?q=...`
- `GET /healthz`

## Run
```bash
cd services/planner-api
python -m venv .venv
source .venv/bin/activate
pip install -e .
PYTHONPATH=../../src python -m planner_api
```

`PLANNER_API_STATE_FILE` can override the default persisted state path.
