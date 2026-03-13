"""FastAPI wrapper exposing planner/state endpoints for mobile clients."""

import json
import os
from pathlib import Path
from typing import TYPE_CHECKING, cast
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
    from reading_plan.api_types import PlannerInputPayload

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8787
DEFAULT_STATE_FILE = "mobile_state.json"
OPEN_LIBRARY_SEARCH_URL = "https://openlibrary.org/search.json"
SEARCH_TIMEOUT_SECONDS = 8
SEARCH_OUTPUT_LIMIT = 20

LOGGER = get_bridge_logger(__name__)


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
    """Return a standardized result dict indicating the state was reset to a fresh state with a warning message.
    Parameters:
        - message (str): Warning message describing why the state is considered invalid or has been reset.
    Returns:
        - dict[str, object]: Dictionary containing:
            - "source" (str): "fresh"
            - "sourcePath" (str): Path to the state file as returned by _state_path()
            - "state" (None): Reset state value (None)
            - "warningCode" (str): "STATE_RESET_FRESH"
            - "warningMessage" (str): The provided warning message"""
    return {
        "source": "fresh",
        "sourcePath": str(_state_path()),
        "state": None,
        "warningCode": "STATE_RESET_FRESH",
        "warningMessage": message,
    }


def _load_state_file() -> dict[str, object]:
    state_path = _state_path()
    if not state_path.exists():
        return _fresh_state_result()
    return _loaded_state_result(state_path)


def _loaded_state_result(state_path: Path) -> dict[str, object]:
    """Load and validate a saved JSON state from a file and return a standardized result dictionary.
    Parameters:
        - state_path (Path): Path to the JSON file containing the saved state to read and validate.
    Returns:
        - dict[str, object]: A result dictionary. On success this contains:
            - "source": "json_primary"
            - "sourcePath": str(state_path)
            - "state": validated state object
    On failure returns an invalid-state result dict (from _invalid_state_result) with an explanatory error message."""
    loaded: object
    try:
        loaded = json.loads(state_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        loaded = None
        return _invalid_state_result("Saved state JSON is invalid.")
    except OSError as error:
        loaded = error
        return _invalid_state_result(f"Could not read saved state: {error}")

    try:
        validated = validate_state_snapshot(loaded)
    except TypeError as error:
        return _invalid_state_result(str(error))

    return {
        "source": "json_primary",
        "sourcePath": str(state_path),
        "state": validated,
    }


def _save_state_file(state: dict[str, object]) -> None:
    validated = validate_state_snapshot(state)
    state_path = _state_path()
    state_path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(validated, indent=2)
    state_path.write_text(payload, encoding="utf-8")


def _sample_payload() -> dict[str, object]:
    """Return a payload dictionary containing serialized sample books and settings.
    Parameters:
        - None
    Returns:
        - dict[str, object]: A dictionary containing:
            - "books": list of serialized book data (each element produced by book_to_data).
            - "settings": serialized settings data (produced by settings_to_data)."""
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
    """Extract the work identifier: return the last path segment of a string separated by '/'.
    Non-string or empty (after trimming) inputs yield an empty string.
    Parameters:
        - raw_key (object): The input value expected to be a string containing '/'-separated segments.
    Returns:
        - str: The last segment of the trimmed input string after splitting on '/', or an empty string if the input is not a non-empty string."""
    if not isinstance(raw_key, str):
        return ""
    trimmed = raw_key.strip()
    if not trimmed:
        return ""
    parts = trimmed.split("/")
    return parts[-1]


def _search_query(query: str, *, author_only: bool) -> str:
    """Constructs an Open Library search URL for a given query or author.
    Parameters:
        - query (str): Search text to send to the Open Library API. When author_only is True, this should be the author name.
        - author_only (bool): If True, generate a URL that filters by author (uses the 'author' parameter). If False, generate a general search URL (uses the 'q' parameter and sets language to "eng").
    Returns:
        - str: An encoded URL string for the Open Library search endpoint incorporating the appropriate parameters and the configured result limit (uses OPEN_LIBRARY_SEARCH_URL and SEARCH_OUTPUT_LIMIT constants).
    Examples:
        - _search_query("Jane Austen", author_only=True) -> "OPEN_LIBRARY_SEARCH_URL?author=Jane+Austen&limit=SEARCH_OUTPUT_LIMIT"
        - _search_query("Pride and Prejudice", author_only=False) -> "OPEN_LIBRARY_SEARCH_URL?q=Pride+and+Prejudice&language=eng&limit=SEARCH_OUTPUT_LIMIT"""
    params: dict[str, str | int] = {"limit": SEARCH_OUTPUT_LIMIT}
    if author_only:
        params["author"] = query
    else:
        params["q"] = query
        params["language"] = "eng"
    return f"{OPEN_LIBRARY_SEARCH_URL}?{urlencode(params)}"


def _search_docs(query: str, *, author_only: bool) -> list[object]:
    if not query.strip():
        return []
    request_url = _search_query(query, author_only=author_only)
    payload = _request_json(request_url)
    docs = payload.get("docs")
    return cast("list[object]", docs) if isinstance(docs, list) else []


def _request_json(request_url: str) -> dict[str, object]:
    """Fetch JSON from the given URL and return it as a dictionary; network or timeout errors are converted to an HTTPException with status 502.
    Parameters:
        - request_url (str): The URL to request JSON from.
    Returns:
        - dict[str, object]: Parsed JSON payload as a dictionary if the top-level JSON value is an object; otherwise returns an empty dict.
    Example:
        - _request_json("https://openlibrary.org/works/OL.../data.json")"""
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
    return cast(
        "dict[str, object]", payload
        ) if isinstance(payload, dict) else {}


def _doc_to_result(doc: object) -> dict[str, str] | None:
    """Convert a document-like mapping into a normalized result dict containing title, author, work_id, and optional cover_url.
    Parameters:
        - doc (object): Input expected to be a dict-like mapping with possible keys "title", "author_name", "key", and "cover_i". If doc is not a dict or lacks both title and author, the function returns None.
    Returns:
        - dict[str, str] | None: A dictionary with keys "author", "title", and "work_id", and "cover_url" if available; or None when input is invalid or missing both title and author."""
    if not isinstance(doc, dict):
        return None
    doc_map = cast("dict[str, object]", doc)

    title = str(doc_map.get("title") or "").strip()
    author = _first_author(doc_map.get("author_name"))
    work_id = _work_id(doc_map.get("key"))
    if not title and not author:
        return None

    result_item: dict[str, str] = {
        "author": author,
        "title": title,
        "work_id": work_id,
    }
    if cover := _cover_url(doc_map.get("cover_i")):
        result_item["cover_url"] = cover
    return result_item


def _first_author(raw_authors: object) -> str:
    if not isinstance(raw_authors, list):
        return ""
    return str(raw_authors[0] or "").strip() if raw_authors else ""


def _search_open_library(
    query: str,
    *,
    author_only: bool,
) -> list[dict[str, str]]:
    """Search Open Library documents for a query and return a list of result dictionaries.
    Parameters:
        - query (str): The search query string.
        - author_only (bool): If True, restrict the search to author fields only.
    Returns:
        - list[dict[str, str]]: A list of result dictionaries (string keys to string values). Items that could not be converted are omitted and the list is truncated to SEARCH_OUTPUT_LIMIT.
    Examples:
        - _search_open_library("Jane Austen", author_only=True)
        - _search_open_library("Pride and Prejudice", author_only=False)"""
    docs = _search_docs(query, author_only=author_only)

    results: list[dict[str, str]] = []
    for doc in docs:
        item = _doc_to_result(doc)
        if item is None:
            continue
        results.append(item)
        if len(results) >= SEARCH_OUTPUT_LIMIT:
            break

    return results


def _api_generate(payload: dict[str, object]) -> object:
    """Generate a plan by casting the incoming payload to PlannerInputPayload and delegating to generate_plan.
    Parameters:
        - payload (dict[str, object]): Incoming request payload expected to conform to the PlannerInputPayload schema.
    Returns:
        - object: The result returned by generate_plan (the generated plan). Raises HTTPException(status_code=400) if the payload is invalid or processing fails."""
    log_file_execution(LOGGER, file_path=__file__, entrypoint="_api_generate")
    log_incoming_data(
        LOGGER,
        event="http_api: plan generate payload type summary",
        file_path=__file__,
        value=payload,
    )
    try:
        request_payload = cast("PlannerInputPayload", payload)
        return generate_plan(request_payload)
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
    """Save the provided state dictionary to persistent storage and return a success indicator.
    Parameters:
        - state (dict[str, object]): The state payload to persist. Expected to be serializable by the underlying storage helper; invalid types will cause a TypeError.
    Returns:
        - dict[str, object]: A simple success indicator of the form {"ok": True} when the save completes.
    Notes:
        - Raises HTTPException(status_code=400) if the state contains invalid types (TypeError).
        - Raises HTTPException(status_code=500) on underlying OS/file errors (OSError).
    Example:
        >>> _api_state_save({"feature_enabled": True})
        {"ok": True}"""
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
    """Search for books using the provided payload, logging execution and incoming data.
    Parameters:
        - payload (dict[str, object]): Payload containing search parameters. Expected keys:
            - "query" (str | None): Search query string; defaults to an empty string when absent.
            - "author" (bool | None): If True, perform an author-only search.
    Returns:
        - list[dict[str, str]]: A list of book records returned by the underlying Open Library search helper; each record is a mapping of string fields describing a book."""
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
