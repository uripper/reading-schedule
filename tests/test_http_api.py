"""HTTP API endpoint coverage for mobile backend."""

from __future__ import annotations

from pathlib import Path

from reading_plan.input.serializers import book_to_data, settings_to_data
from reading_plan.http_api import (
    _load_state_file,
    _sample_payload,
    _save_state_file,
    _search_open_library,
)
from reading_plan.api import generate_plan
from tests.helpers import demo_books, demo_settings


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
    assert loaded["state"]["preferences"]["theme"] == "system"


def test_plan_generate_endpoint() -> None:
    payload = {
        "planner": "greedy",
        "books": [book_to_data(book) for book in demo_books()],
        "settings": settings_to_data(demo_settings()),
    }

    body = generate_plan(payload)
    assert "summary" in body
    assert "schedule" in body


def test_state_sample_endpoint() -> None:
    body = _sample_payload()
    assert isinstance(body.get("books"), list)
    assert isinstance(body.get("settings"), dict)


def test_books_search_empty_query_returns_empty() -> None:
    assert _search_open_library("   ", author_only=False) == []
