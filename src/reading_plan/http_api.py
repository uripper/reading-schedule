"""FastAPI wrapper exposing planner/state endpoints for mobile clients."""

import json
import os
from pathlib import Path
from typing import TYPE_CHECKING, TypeGuard
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import urlopen

from fastapi import FastAPI, HTTPException
import uvicorn

from reading_plan.api import generate_plan
from reading_plan.bridge_logging import (
    configure_bridge_logger,
    get_bridge_logger,
    log_file_execution,
    log_incoming_data,
)
from reading_plan.input.reading_io import load_inputs
from reading_plan.input.serializers import book_to_data, settings_to_data
from reading_plan.state_validation import validate_state_snapshot


if TYPE_CHECKING:
    from reading_plan.api_types import (
        BookData,
        PlannerInputPayload,
        SettingsData,
    )

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8787
DEFAULT_STATE_FILE = "mobile_state.json"
OPEN_LIBRARY_SEARCH_URL = "https://openlibrary.org/search.json"
SEARCH_TIMEOUT_SECONDS = 8
SEARCH_OUTPUT_LIMIT = 20

LOGGER = get_bridge_logger(__name__)


def _is_object_dict(value: object) -> TypeGuard[dict[str, object]]:
    return isinstance(value, dict) and all(
        isinstance(key, str) for key in value
    )


def _is_object_list(value: object) -> TypeGuard[list[object]]:
    return isinstance(value, list)


def _is_book_data_list(value: object) -> TypeGuard[list[BookData]]:
    return _is_object_list(value) and all(
        _is_object_dict(item) for item in value
    )


def _is_settings_data(value: object) -> TypeGuard[SettingsData]:
    return _is_object_dict(value)


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _data_dir() -> Path:
    return _repo_root() / "data"


def _sample_books_path() -> Path:
    return _data_dir() / "books.sample.json"


def _sample_settings_path() -> Path:
    return _data_dir() / "settings.json"


def _state_path() -> Path:
    configured = os.environ.get("READING_PLAN_API_STATE_PATH", "").strip()
    return Path(configured) if configured else _data_dir() / DEFAULT_STATE_FILE


def _fresh_state_result() -> dict[str, object]:
    return {
        "source": "fresh",
        "sourcePath": str(_state_path()),
        "state": None,
    }


def _invalid_state_result(message: str) -> dict[str, object]:
    """Return a standardized fresh-state response.

    The payload marks the state source as `"fresh"`, uses the configured state
    path, clears the persisted state value, and attaches the
    `"STATE_RESET_FRESH"` warning code together with the supplied message.
    """
    return {
        "source": "fresh",
        "sourcePath": str(_state_path()),
        "state": None,
        "warningCode": "STATE_RESET_FRESH",
        "warningMessage": message,
    }


def _loaded_state_result(state_path: Path) -> dict[str, object]:
    """Load and validate the saved mobile state file.

    The file is parsed as JSON and then validated with
    `validate_state_snapshot(...)`. On success the response reports
    `"json_primary"` as the source and returns the validated state. JSON parse
    errors, file read failures, and validation failures are all normalized
    into `_invalid_state_result(...)`.
    """
    try:
        loaded = json.loads(state_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return _invalid_state_result("Saved state JSON is invalid.")
    except OSError as error:
        return _invalid_state_result(f"Could not read saved state: {error}")
    return _validated_state_result(state_path, loaded)


def _validated_state_result(
    state_path: Path,
    loaded: object,
) -> dict[str, object]:
    """Validate parsed state JSON and return a normalized response."""
    try:
        validated = validate_state_snapshot(loaded)
    except TypeError as error:
        return _invalid_state_result(str(error))
    return {
        "source": "json_primary",
        "sourcePath": str(state_path),
        "state": validated,
    }


def _load_state_file() -> dict[str, object]:
    state_path = _state_path()
    if not state_path.exists():
        return _fresh_state_result()
    return _loaded_state_result(state_path)


def _save_state_file(state: dict[str, object]) -> None:
    validated = validate_state_snapshot(state)
    state_path = _state_path()
    state_path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(validated, indent=2)
    state_path.write_text(payload, encoding="utf-8")


def _sample_payload() -> dict[str, object]:
    """Return serialized sample planner inputs.

    The payload contains `"books"` rows produced by `book_to_data(...)` and a
    `"settings"` object produced by `settings_to_data(...)`.
    """
    books, settings = load_inputs(
        str(_sample_books_path()),
        str(_sample_settings_path()),
    )
    return {
        "books": [book_to_data(book) for book in books],
        "settings": settings_to_data(settings),
    }


def _cover_url(cover_id: object) -> str | None:
    if not isinstance(cover_id, int):
        return None
    return f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"


def _work_id(raw_key: object) -> str:
    """Extract the final work-id segment from an Open Library key.

    Non-string inputs, blank strings, and strings that become empty after
    trimming produce an empty string.
    """
    if not isinstance(raw_key, str):
        return ""
    trimmed = raw_key.strip()
    if not trimmed:
        return ""
    return trimmed.split("/")[-1]


def _search_query(query: str, *, author_only: bool) -> str:
    """Build an Open Library search URL for title or author queries.

    When `author_only` is true the query is sent through the `author`
    parameter. Otherwise it uses the general `q` parameter and constrains the
    search to English results. The configured output limit is always included.
    """
    params: dict[str, str | int] = {"limit": SEARCH_OUTPUT_LIMIT}
    if author_only:
        params["author"] = query
    else:
        params["q"] = query
        params["language"] = "eng"
    return f"{OPEN_LIBRARY_SEARCH_URL}?{urlencode(params)}"


def _request_json(request_url: str) -> dict[str, object]:
    """Fetch JSON from Open Library and return an object payload.

    Network and timeout failures are converted into
    `HTTPException(status_code=502)`. If the remote JSON is not an object, the
    function returns an empty dictionary.
    """
    try:
        with urlopen(  # noqa: S310 - fixed OpenLibrary HTTPS endpoint
            request_url,
            timeout=SEARCH_TIMEOUT_SECONDS,
        ) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (OSError, TimeoutError, URLError) as error:
        raise HTTPException(
            status_code=502,
            detail=f"Book search failed: {error}",
        ) from error
    if _is_object_dict(payload):
        return payload
    return {}


def _search_docs(query: str, *, author_only: bool) -> list[object]:
    if not query.strip():
        return []
    request_url = _search_query(query, author_only=author_only)
    payload = _request_json(request_url)
    docs = payload.get("docs")
    if _is_object_list(docs):
        return docs
    return []


def _doc_to_result(doc: object) -> dict[str, str] | None:
    """Normalize one Open Library result row.

    Valid rows produce a dictionary containing `author`, `title`, and
    `work_id`. A `cover_url` field is added when a usable cover id is present.
    Non-dictionary inputs, or rows missing both title and author, return
    `None`.
    """
    if not _is_object_dict(doc):
        return None
    title = str(doc.get("title") or "").strip()
    author = _first_author(doc.get("author_name"))
    work_id = _work_id(doc.get("key"))
    if not title and not author:
        return None
    result_item: dict[str, str] = {
        "author": author,
        "title": title,
        "work_id": work_id,
    }
    if cover := _cover_url(doc.get("cover_i")):
        result_item["cover_url"] = cover
    return result_item


def _first_author(raw_authors: object) -> str:
    if not _is_object_list(raw_authors) or not raw_authors:
        return ""
    return str(raw_authors[0] or "").strip()


def _search_open_library(
    query: str,
    *,
    author_only: bool,
) -> list[dict[str, str]]:
    """Search Open Library and return normalized result rows.

    Rows that cannot be normalized are skipped, and the output is capped at
    `SEARCH_OUTPUT_LIMIT`.
    """
    results: list[dict[str, str]] = []
    for doc in _search_docs(query, author_only=author_only):
        item = _doc_to_result(doc)
        if item is None:
            continue
        results.append(item)
        if len(results) >= SEARCH_OUTPUT_LIMIT:
            break
    return results


def _planner_input_payload(payload: dict[str, object]) -> PlannerInputPayload:
    """Validate the top-level planner payload shape before generation.

    The HTTP layer expects `books` and `settings` fields compatible with the
    shared planner payload contracts. An optional `planner` string is allowed
    to select a solver profile.
    """
    books = payload.get("books")
    settings = payload.get("settings")
    planner = payload.get("planner")
    if not _is_book_data_list(books):
        msg = "Planner payload field 'books' must be a list of objects."
        raise TypeError(msg)
    if not _is_settings_data(settings):
        msg = "Planner payload field 'settings' must be an object."
        raise TypeError(msg)
    request_payload: PlannerInputPayload = {
        "books": books,
        "settings": settings,
    }
    if planner is not None:
        if not isinstance(planner, str):
            msg = "Planner payload field 'planner' must be a string."
            raise TypeError(msg)
        request_payload["planner"] = planner
    return request_payload


def _api_generate(payload: dict[str, object]) -> object:
    """Generate a plan from a validated planner payload.

    Invalid input or planner runtime failures are surfaced to the client as
    `HTTPException(status_code=400)`.
    """
    log_file_execution(LOGGER, file_path=__file__, entrypoint="_api_generate")
    log_incoming_data(
        LOGGER,
        event="http_api: plan generate payload type summary",
        file_path=__file__,
        value=payload,
    )
    try:
        return generate_plan(_planner_input_payload(payload))
    except (TypeError, ValueError, RuntimeError, OSError) as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


def _api_state_load(_payload: dict[str, object]) -> dict[str, object]:
    log_file_execution(LOGGER, file_path=__file__, entrypoint="_api_state_load")
    return _load_state_file()


def _api_state_sample(_payload: dict[str, object]) -> dict[str, object]:
    log_file_execution(
        LOGGER,
        file_path=__file__,
        entrypoint="_api_state_sample",
    )
    return _sample_payload()


def _api_state_save(state: dict[str, object]) -> dict[str, object]:
    """Persist validated mobile state and return a success flag.

    Validation errors become `HTTPException(status_code=400)`. File-system
    write failures become `HTTPException(status_code=500)`.
    """
    log_file_execution(LOGGER, file_path=__file__, entrypoint="_api_state_save")
    log_incoming_data(
        LOGGER,
        event="http_api: state save payload type summary",
        file_path=__file__,
        value=state,
    )
    try:
        _save_state_file(state)
    except TypeError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except OSError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
    return {"ok": True}


def _api_books_search(payload: dict[str, object]) -> list[dict[str, str]]:
    """Search Open Library using the provided query payload.

    The payload accepts a `query` string and an `author` boolean. When the
    boolean is true, the search is restricted to author matches.
    """
    log_file_execution(
        LOGGER,
        file_path=__file__,
        entrypoint="_api_books_search",
    )
    log_incoming_data(
        LOGGER,
        event="http_api: book search payload type summary",
        file_path=__file__,
        value=payload,
    )
    query = str(payload.get("query") or "")
    author_only = payload.get("author") is True
    return _search_open_library(query, author_only=author_only)


def create_app() -> FastAPI:
    """Create the planner HTTP API app used by mobile clients."""
    configure_bridge_logger()
    log_file_execution(LOGGER, file_path=__file__, entrypoint="create_app")
    app = FastAPI(title="Reading Plan API", version="0.1.0")
    app.post("/api/plan/generate")(_api_generate)
    app.post("/api/state/load")(_api_state_load)
    app.post("/api/state/sample")(_api_state_sample)
    app.post("/api/state/save")(_api_state_save)
    app.post("/api/books/search")(_api_books_search)
    return app


app = create_app()


def main() -> int:
    """Run the planner API using uvicorn."""
    host = os.environ.get("READING_PLAN_API_HOST", DEFAULT_HOST)
    port_text = os.environ.get("READING_PLAN_API_PORT", str(DEFAULT_PORT))
    try:
        port = int(port_text)
    except ValueError:
        port = DEFAULT_PORT
    uvicorn.run(app, host=host, port=port)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
