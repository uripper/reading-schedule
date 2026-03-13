"""Regression tests for the packaged planner bridge entrypoint."""

from __future__ import annotations

import json
import typing

from reading_plan.bridge_entry import main as bridge_main
from reading_plan.input.serializers import book_to_data, settings_to_data
from reading_plan.planner_types import WEEKDAYS
from tests.helpers import demo_books, demo_settings


if typing.TYPE_CHECKING:
    from pathlib import Path

    import pytest


def write_sample_inputs(tmp_path: Path) -> tuple[Path, Path]:
    """Write sample books/settings payloads to the temporary test directory."""
    books_path = tmp_path / "books.sample.json"
    settings_path = tmp_path / "settings.json"
    books_payload = [book_to_data(book) for book in demo_books()]
    settings_payload = settings_to_data(demo_settings())
    books_path.write_text(json.dumps(books_payload), encoding="utf-8")
    settings_path.write_text(json.dumps(settings_payload), encoding="utf-8")
    return books_path, settings_path


def bridge_sample_args(books_path: Path, settings_path: Path) -> list[str]:
    """Build packaged bridge CLI args for gui sample mode."""
    return [
        "planner-bridge",
        "reading_plan.gui_api",
        "--sample",
        "--data",
        str(books_path),
        "--settings",
        str(settings_path),
    ]


def test_bridge_entry_runs_gui_sample_mode(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    tmp_path: Path,
) -> None:
    """Packaged planner entry should forward sample-mode args to gui_api."""
    books_path, settings_path = write_sample_inputs(tmp_path)
    monkeypatch.setenv(
        "READING_PLAN_BRIDGE_LOG_PATH",
        str(tmp_path / "bridge.log"),
    )
    exit_code = bridge_main(bridge_sample_args(books_path, settings_path))
    payload = json.loads(capsys.readouterr().out)
    assert exit_code == 0
    assert payload["ok"] is True
    assert len(payload["data"]["books"]) == len(demo_books())
    assert payload["data"]["books"][0]["scheduled_days"] == list(WEEKDAYS)
