"""Regression tests for sample data defaults."""

import json
import sys
from typing import TYPE_CHECKING

from reading_plan.gui_api import (
    main as gui_main,
    parse_args as parse_gui_args,
)
from reading_plan.input.serializers import book_to_data, settings_to_data
from reading_plan.planner_types import WEEKDAYS
from tests.helpers import demo_books, demo_settings

if TYPE_CHECKING:
    from pathlib import Path

    import pytest


def test_gui_defaults_to_committed_sample_books_file(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """GUI bridge should default sample mode to committed sample books file."""
    monkeypatch.setattr(sys, "argv", ["reading_plan.gui_api"])
    args = parse_gui_args()
    assert args.data == "data/books.sample.json"
    assert args.settings == "data/settings.json"


def test_gui_sample_mode_succeeds_with_explicit_sample_paths(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    tmp_path: Path,
) -> None:
    """GUI sample mode should return a structured sample payload."""
    books_path = tmp_path / "books.sample.json"
    settings_path = tmp_path / "settings.json"
    books_payload = [book_to_data(book) for book in demo_books()]
    settings_payload = settings_to_data(demo_settings())
    books_path.write_text(json.dumps(books_payload), encoding="utf-8")
    settings_path.write_text(json.dumps(settings_payload), encoding="utf-8")
    monkeypatch.setenv(
        "READING_PLAN_BRIDGE_LOG_PATH",
        str(tmp_path / "bridge.log"),
    )
    monkeypatch.setattr(
        sys,
        "argv",
        [
            "reading_plan.gui_api",
            "--sample",
            "--data",
            str(books_path),
            "--settings",
            str(settings_path),
        ],
    )
    exit_code = gui_main()
    output = capsys.readouterr().out
    payload = json.loads(output)
    assert exit_code == 0
    assert payload["ok"] is True
    assert len(payload["data"]["books"]) == len(demo_books())
    assert payload["data"]["books"][0]["remaining_words"] == 12000
    assert payload["data"]["books"][0]["words_total"] == 15000
    assert payload["data"]["books"][0]["scheduled_days"] == list(WEEKDAYS)
