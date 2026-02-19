from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .book_search import search_books
from .models import AppStateV2, BookSearchResponse, ErrorBody, ErrorResponse, GeneratePlanPayload, GeneratePlanResponse
from .state_store import load_state, save_state

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from reading_plan.api import generate_plan  # noqa: E402

app = FastAPI(title="Reading Planner API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _error(code: str, message: str, status: int, details: Any | None = None) -> JSONResponse:
    payload = ErrorResponse(error=ErrorBody(code=code, message=message, details=details)).model_dump(mode="json")
    return JSONResponse(status_code=status, content=payload)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.post(
    "/v1/plan/generate",
    response_model=GeneratePlanResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
def generate_plan_v1(payload: GeneratePlanPayload) -> GeneratePlanResponse | JSONResponse:
    try:
        result = generate_plan(payload.model_dump(mode="python"))
        return GeneratePlanResponse.model_validate(result)
    except ValueError as exc:
        return _error("BAD_REQUEST", str(exc), 400)
    except Exception as exc:
        return _error("PLANNER_FAILURE", str(exc), 500)


@app.get("/v1/state", response_model=AppStateV2, responses={404: {"model": ErrorResponse}})
def get_state_v1() -> AppStateV2:
    state = load_state()
    if state is None:
        raise HTTPException(status_code=404, detail="State not found")
    return state


@app.put("/v1/state", responses={200: {"content": {"application/json": {}}}, 400: {"model": ErrorResponse}})
def put_state_v1(state: AppStateV2) -> dict[str, bool]:
    if state.schemaVersion != 2:
        raise HTTPException(status_code=400, detail="schemaVersion must be 2")
    save_state(state)
    return {"ok": True}


@app.get("/v1/books/search", response_model=BookSearchResponse)
def search_books_v1(q: str = Query(default="", min_length=0, max_length=120)) -> BookSearchResponse:
    return BookSearchResponse(items=search_books(q))


@app.exception_handler(HTTPException)
async def http_exception_handler(_request, exc: HTTPException) -> JSONResponse:
    message = "Request failed"
    if exc.detail:
        message = str(exc.detail)
    return _error("HTTP_ERROR", message, exc.status_code)


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request, exc: Exception) -> JSONResponse:
    return _error("INTERNAL_ERROR", str(exc), 500)
