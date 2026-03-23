"""HTTP API endpoint coverage for mobile backend."""

import json
from typing import TYPE_CHECKING, cast

import pytest

from reading_plan.planner_types import WEEKDAYS

if TYPE_CHECKING:
    from pathlib import Path

    from reading_plan.api_types import PlannerInputPayload


try:
    from fastapi.testclient import TestClient

    HAS_TEST_CLIENT = True
except RuntimeError:
    TestClient = object  # type: ignore[assignment]
    HAS_TEST_CLIENT = False

from reading_plan import http_api
from reading_plan.api import generate_plan
from reading_plan.http_api import (
    _load_state_file,
    _sample_payload,
    _save_state_file,
    _search_open_library,
    create_app,
)
from reading_plan.input.serializers import book_to_data, settings_to_data
from reading_plan.type_guards import is_str_object_dict
from tests.helpers import demo_books, demo_settings


def _write_sample_input_files(tmp_path: Path) -> tuple[Path, Path]:
    books_path = tmp_path / "books.sample.json"
    settings_path = tmp_path / "settings.json"
    books_payload = [book_to_data(book) for book in demo_books()]
    settings_payload = settings_to_data(demo_settings())
    books_path.write_text(json.dumps(books_payload), encoding="utf-8")
    settings_path.write_text(json.dumps(settings_payload), encoding="utf-8")
    return books_path, settings_path


def test_state_load_returns_fresh_when_missing(
    tmp_path: Path,
    monkeypatch,
) -> None:
    state_path = tmp_path / "state.json"
    monkeypatch.setenv("READING_PLAN_API_STATE_PATH", str(state_path))
    payload = _load_state_file()
    assert payload["source"] == "fresh"
    assert payload["state"] is None


def test_state_save_and_load_roundtrip(tmp_path: Path, monkeypatch) -> None:
    state_path = tmp_path / "mobile_state.json"
    monkeypatch.setenv("READING_PLAN_API_STATE_PATH", str(state_path))

    snapshot = {
        "books": [],
        "settings": {},
        "sessions": [],
        "schedule_completions": {},
        "blocked_day_books": {},
        "feature_flags": {
            "gamificationEnabled": False,
            "recommendationsEnabled": False,
            "socialEnabled": False,
        },
        "preferences": {
            "dailyGoalMinutes": 30,
            "reduceMotion": False,
            "reminderEnabled": False,
            "reminderTime": "20:00",
            "theme": "system",
            "timezone": "UTC",
        },
        "last_result": None,
    }

    _save_state_file(snapshot)
    loaded = _load_state_file()
    assert loaded["source"] == "json_primary"
    state = loaded.get("state")
    assert isinstance(state, dict)
    state_map = cast("dict[str, object]", state)
    preferences = state_map.get("preferences")
    assert isinstance(preferences, dict)
    preferences_map = cast("dict[str, object]", preferences)
    assert preferences_map.get("theme") == "system"


def test_state_load_rejects_invalid_snapshot(
    tmp_path: Path, monkeypatch
) -> None:
    state_path = tmp_path / "mobile_state.json"
    monkeypatch.setenv("READING_PLAN_API_STATE_PATH", str(state_path))
    invalid = {
        "books": [],
        "settings": {},
        "sessions": [],
    }
    state_path.write_text(json.dumps(invalid), encoding="utf-8")

    loaded = _load_state_file()

    assert loaded["source"] == "fresh"
    assert loaded["state"] is None
    assert loaded["warningCode"] == "STATE_RESET_FRESH"


def test_state_save_rejects_invalid_snapshot(
    tmp_path: Path, monkeypatch
) -> None:
    state_path = tmp_path / "mobile_state.json"
    monkeypatch.setenv("READING_PLAN_API_STATE_PATH", str(state_path))

    invalid = {
        "books": [],
        "settings": {},
        "sessions": [],
    }

    with pytest.raises(TypeError) as error:
        _save_state_file(invalid)
    assert "Saved state payload" in str(error.value)


def test_plan_generate_endpoint() -> None:
    payload: PlannerInputPayload = {
        "books": [book_to_data(book) for book in demo_books()],
        "settings": settings_to_data(demo_settings()),
    }

    body = generate_plan(payload)
    assert "summary" in body
    assert "schedule" in body


def test_state_sample_endpoint(tmp_path: Path, monkeypatch) -> None:
    books_path, settings_path = _write_sample_input_files(tmp_path)
    monkeypatch.setattr(http_api, "_sample_books_path", lambda: books_path)
    monkeypatch.setattr(http_api, "_sample_settings_path", lambda: settings_path)
    payload = _sample_payload()

    assert isinstance(payload, dict)
    books = payload.get("books")
    settings = payload.get("settings")
    assert isinstance(books, list)
    assert isinstance(settings, dict)
    assert len(books) == len(demo_books())
    first_book = books[0]
    assert is_str_object_dict(first_book)
    assert first_book.get("scheduled_days") == list(WEEKDAYS)


def test_books_search_empty_query_returns_empty() -> None:
    assert _search_open_library("   ", author_only=False) == []


def _create_client() -> TestClient:
    return TestClient(create_app())


@pytest.mark.skipif(not HAS_TEST_CLIENT, reason="fastapi[test] extras missing")
def test_state_load_endpoint_http(tmp_path: Path, monkeypatch) -> None:
    state_path = tmp_path / "state.json"
    monkeypatch.setenv("READING_PLAN_API_STATE_PATH", str(state_path))

    client = _create_client()
    response = client.post("/api/state/load", json={})

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, dict)
    assert "source" in body
    assert "state" in body


@pytest.mark.skipif(not HAS_TEST_CLIENT, reason="fastapi[test] extras missing")
def test_state_sample_endpoint_http(tmp_path: Path, monkeypatch) -> None:
    books_path, settings_path = _write_sample_input_files(tmp_path)
    monkeypatch.setattr(http_api, "_sample_books_path", lambda: books_path)
    monkeypatch.setattr(http_api, "_sample_settings_path", lambda: settings_path)
    client = _create_client()
    response = client.post("/api/state/sample", json={})

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, dict)
    books = body.get("books")
    settings = body.get("settings")
    assert isinstance(books, list)
    assert isinstance(settings, dict)
    assert len(books) == len(demo_books())


@pytest.mark.skipif(not HAS_TEST_CLIENT, reason="fastapi[test] extras missing")
def test_state_save_endpoint_http(tmp_path: Path, monkeypatch) -> None:
    state_path = tmp_path / "state.json"
    monkeypatch.setenv("READING_PLAN_API_STATE_PATH", str(state_path))

    client = _create_client()

    payload = {
        "books": [],
        "settings": settings_to_data(demo_settings()),
        "sessions": [],
        "schedule_completions": {},
        "blocked_day_books": {},
        "feature_flags": {
            "gamificationEnabled": False,
            "recommendationsEnabled": False,
            "socialEnabled": False,
        },
        "preferences": {
            "dailyGoalMinutes": 30,
            "reduceMotion": False,
            "reminderEnabled": False,
            "reminderTime": "20:00",
            "theme": "system",
            "timezone": "UTC",
        },
        "last_result": None,
    }
    response = client.post("/api/state/save", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, dict)
    assert body.get("ok") is True


@pytest.mark.skipif(not HAS_TEST_CLIENT, reason="fastapi[test] extras missing")
def test_books_search_endpoint_http(monkeypatch) -> None:
    client = _create_client()

    def fake_search(query: str, *, author_only: bool) -> list[dict[str, str]]:
        assert query == "test"
        assert not author_only
        return [{"author": "A", "title": "B", "work_id": "W1"}]

    monkeypatch.setattr(http_api, "_search_open_library", fake_search)
    response = client.post("/api/books/search", json={"query": "test"})

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert body
