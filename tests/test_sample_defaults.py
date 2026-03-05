"""Regression tests for sample data defaults."""

from __future__ import annotations

import json
from pathlib import Path
import sys

import pytest

from reading_plan.gui_api import (
    main as gui_main,
    parse_args as parse_gui_args,
)

REPO_ROOT = Path(__file__).resolve().parent.parent


def test_gui_defaults_to_committed_sample_books_file(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """GUI bridge should default sample mode to committed sample books file."""
    monkeypatch.setattr(sys, "argv", ["reading_plan.gui_api"])
    args = parse_gui_args()
    assert args.data == "data/books.sample.csv"
    assert args.settings == "data/settings.json"


def test_gui_sample_mode_succeeds_with_default_paths(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    """GUI sample mode should return a structured error payload."""
    monkeypatch.chdir(REPO_ROOT)
    monkeypatch.setattr(sys, "argv", ["reading_plan.gui_api", "--sample"])
    exit_code = gui_main()
    output = capsys.readouterr().out
    payload = json.loads(output)
    assert exit_code == 1
    assert payload["ok"] is False
    assert "words_full" in payload["error"]
