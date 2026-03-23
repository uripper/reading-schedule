"""FastAPI wrapper exposing planner/state endpoints for mobile clients.

Endpoint contract:
- POST /api/plan/generate
    - Request: planner payload with books/settings and optional planner name.
    - Response: generated plan object from ``reading_plan.api.generate_plan``.
    - Errors: 400 when payload validation or planning fails.
- POST /api/state/load
    - Request: empty JSON object.
    - Response: state load result with ``source``, ``sourcePath``, and ``state``
        Invalid saved state is normalized to ``source="fresh"`` with warning
        metadata.
- POST /api/state/sample
    - Request: empty JSON object.
    - Response: sample ``books`` and ``settings`` payload.
- POST /api/state/save
    - Request: full state snapshot.
    - Response: ``{"ok": true}``.
    - Errors: 400 for validation failures, 500 for write failures.
- POST /api/books/search
    - Request: ``{"query": str, "author": bool}``.
    - Response: list of normalized Open Library results.
    - Errors: 502 when Open Library cannot be reached.

Environment variables:
- ``READING_PLAN_API_HOST``: bind host (default: ``127.0.0.1``).
- ``READING_PLAN_API_PORT``: bind port (default: ``8787``).
- ``READING_PLAN_API_STATE_PATH``: state file override path.
"""

from contextlib import closing
from http.client import (
    HTTPException as ClientHTTPException,
    HTTPSConnection,
)
import json
import os
from pathlib import Path
from typing import TYPE_CHECKING
from urllib.parse import urlencode

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
from reading_plan.type_guards import (
    is_book_data_list,
    is_object_list,
    is_settings_data,
    is_str_object_dict,
)


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
STATUS_OK = 200
STATUS_BAD_GATEWAY = 502

LOGGER = get_bridge_logger(__name__)
# TODO: Is there a reason we are so reliant on "object" types for everything?
# Is that not greatly reducing type safety and effectively acting as an `Any`?


def _repo_root() -> Path:
    """Return the repository root directory."""
    return Path(__file__).resolve().parents[2]


def _data_dir() -> Path:
    """Return the repository data directory."""
    return _repo_root() / "data"


def _sample_books_path() -> Path:
    """Return the sample books fixture path."""
    return _data_dir() / "books.sample.json"


def _sample_settings_path() -> Path:
    """Return the sample settings fixture path."""
    return _data_dir() / "settings.json"


def _state_path() -> Path:
    """Return the configured mobile state file path."""
    configured = os.environ.get("READING_PLAN_API_STATE_PATH", "").strip()
    return Path(configured) if configured else _data_dir() / DEFAULT_STATE_FILE


def _fresh_state_result() -> dict[str, object]:
    """Return the normalized payload for an absent state file."""
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

    Returns:
        Normalized state payload.
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
    """Validate parsed state JSON and return a normalized response.

    Returns:
        Either a validated or invalidated state result.
    """
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
    """Load the configured mobile state file or fall back to fresh state.

    Returns:
        Normalized state payload.
    """
    state_path = _state_path()
    if not state_path.exists():
        return _fresh_state_result()
    return _loaded_state_result(state_path)


def _save_state_file(state: object) -> None:
    """Validate and persist the mobile state snapshot."""
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
    """Return the canonical Open Library cover URL for an integer cover id."""
    if not isinstance(cover_id, int):
        return None
    return f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"


# TODO: What is the work-id segment this is returning?


def _work_id(raw_key: object) -> str:
    """Extract the final work-id segment from an Open Library key.

    Non-string inputs, blank strings, and strings that become empty after
    trimming produce an empty string.

    Returns:
        Final work-id segment.
    """
    if not isinstance(raw_key, str):
        return ""
    trimmed = raw_key.strip()
    return trimmed.split("/")[-1] if trimmed else ""


def _search_query(query: str, *, author_only: bool) -> str:
    """Build an Open Library search URL for title or author queries.

    When `author_only` is true the query is sent through the `author`
    parameter. Otherwise it uses the general `q` parameter and constrains the
    search to English results. The configured output limit is always included.

    Returns:
        Normalized search URL.
    """
    params: dict[str, str | int] = {"limit": SEARCH_OUTPUT_LIMIT}
    if author_only:
        params["author"] = query
    else:
        params["q"] = query
        params["language"] = "eng"
    return f"{OPEN_LIBRARY_SEARCH_URL}?{urlencode(params)}"


def _open_library_query_string(request_url: str) -> str:
    """Return the query string segment for the fixed Open Library endpoint."""
    prefix = f"{OPEN_LIBRARY_SEARCH_URL}?"
    return request_url.removeprefix(prefix)


# TODO: Fix return type or explicitly return something.


def _fetch_open_library_payload(query: str) -> object:
    """Fetch raw Open Library payload using a fixed HTTPS host/path.

    Raises:
        HTTPException: Open Library request failed.
    """
    try:
        with closing(
            HTTPSConnection("openlibrary.org", timeout=SEARCH_TIMEOUT_SECONDS),
        ) as connection:
            connection.request("GET", f"/search.json?{query}")
            response = connection.getresponse()
            if response.status != STATUS_OK:
                raise HTTPException(
                    status_code=STATUS_BAD_GATEWAY,
                    detail="Book search failed:" +
                    f"Open Library responded with {response.status}",
                )
    except (
        ClientHTTPException,
        OSError,
        TimeoutError,
        json.JSONDecodeError,
        UnicodeDecodeError,
    ) as error:
        raise HTTPException(
            status_code=STATUS_BAD_GATEWAY,
            detail=f"Book search failed: {error}",
        ) from error


def _request_json(request_url: str) -> dict[str, object]:
    """Fetch JSON from Open Library and return an object payload.

    Network and timeout failures are converted into
    `HTTPException(status_code=STATUS_BAD_GATEWAY)`. If the remote JSON is not
    an object, the function returns an empty dictionary.

    Returns:
        Open Library JSON object, or an empty dictionary.

    """
    query = _open_library_query_string(request_url)
    payload = _fetch_open_library_payload(query)
    return payload if is_str_object_dict(payload) else {}


def _search_docs(query: str, *, author_only: bool) -> list[object]:
    """Return raw Open Library docs for a title or author query."""
    if not query.strip():
        return []
    request_url = _search_query(query, author_only=author_only)
    payload = _request_json(request_url)
    docs = payload.get("docs")
    return docs if is_object_list(docs) else []


def _doc_to_result(doc: object) -> dict[str, str] | None:
    """Normalize one Open Library result row.

    Valid rows produce a dictionary containing `author`, `title`, and
    `work_id`. A `cover_url` field is added when a usable cover id is present.
    Non-dictionary inputs, or rows missing both title and author, return
    `None`.

    Returns:
        Either a dictionary containing author, title, and work_id or None
    """
    if not is_str_object_dict(doc):
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
    """Return the first normalized author name, if present."""
    if not is_object_list(raw_authors) or not raw_authors:
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

    Returns:
        Results from the Open Library search.
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

    The HTTP layer expects ``books`` and ``settings`` fields compatible with the
    shared planner payload contracts. The solver profile is read from
    ``settings.planner_solver_profile`` by the downstream planner.

    Returns:
        Validated planner input payload.
    """
    return {
        "books": _planner_books(payload),
        "settings": _planner_settings(payload),
    }


def _planner_books(payload: dict[str, object]) -> list[BookData]:
    """Return validated planner books payload.

    Returns:
        Validated planner books list.

    Raises:
        TypeError: Books aren't a list of objects.
    """
    books = payload.get("books")
    if is_book_data_list(books):
        return books
    msg = "Planner payload field 'books' must be a list of objects."
    raise TypeError(msg)


def _planner_settings(payload: dict[str, object]) -> SettingsData:
    """Return validated planner settings payload.

    Returns:
        Validated planner settings object.

    Raises:
        TypeError: Settings is not an object.
    """
    settings = payload.get("settings")
    if is_settings_data(settings):
        return settings
    msg = "Planner payload field 'settings' must be an object."
    raise TypeError(msg)


# TODO: Why are these all generalized as HTTPException?


def _api_generate(payload: dict[str, object]) -> object:
    """Generate a plan from a validated planner payload.

    Invalid input or planner runtime failures are surfaced to the client as
    `HTTPException(status_code=400)`.

    Returns:
        Generated planning payload.

    Raises:
        HTTPException: Validation or planner execution failed.
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
    """Load the persisted mobile state snapshot.

    Returns:
        Normalized mobile state payload.
    """
    log_file_execution(LOGGER, file_path=__file__, entrypoint="_api_state_load")
    return _load_state_file()


def _api_state_sample(_payload: dict[str, object]) -> dict[str, object]:
    """Return the sample mobile planner payload."""
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

    Returns:
        Success status payload.

    Raises:
        HTTPException: Either a TypeError or an OSError.
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

    The payload accepts a ``query`` value and an ``author`` boolean. ``query``
    is coerced to a string, and author-only mode is enabled only when
    ``author is True``.

    Returns:
        Normalized Open Library result rows.
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
    """Create the planner HTTP API app used by mobile clients.

    Returns:
        Configured FastAPI app with planner, state, and search endpoints.
    """
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
    """Run the planner API using uvicorn.

    Returns:
        Exit status code ``0`` after the uvicorn server stops.
    """
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
