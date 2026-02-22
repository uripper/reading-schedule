"""Regression tests for sample data defaults."""

from __future__ import annotations

import json
from pathlib import Path
import sys

from reading_plan.cli import parse_args as parse_cli_args
from reading_plan.gui_api import (
    main as gui_main,
    parse_args as parse_gui_args,
)

REPO_ROOT = Path(__file__).resolve().parent.parent


def test_cli_defaults_to_committed_sample_books_file(monkeypatch) -> None:
    """CLI should default to the committed sample books file."""
    monkeypatch.setattr(sys, "argv", ["reading_plan.cli"])
    args = parse_cli_args()
    assert args.data == "data/books.sample.csv"
    assert args.settings == "data/settings.json"


def test_gui_defaults_to_committed_sample_books_file(monkeypatch) -> None:
    """GUI bridge should default sample mode to committed sample books file."""
    monkeypatch.setattr(sys, "argv", ["reading_plan.gui_api"])
    args = parse_gui_args()
    assert args.data == "data/books.sample.csv"
    assert args.settings == "data/settings.json"


def test_gui_sample_mode_succeeds_with_default_paths(
    monkeypatch, capsys
) -> None:
    """GUI sample mode should succeed on a fresh clone with default args."""
    monkeypatch.chdir(REPO_ROOT)
    monkeypatch.setattr(sys, "argv", ["reading_plan.gui_api", "--sample"])
    exit_code = gui_main()
    output = capsys.readouterr().out
    payload = json.loads(output)
    assert exit_code == 0
    assert payload["ok"] is True
    assert isinstance(payload["data"]["books"], list)
    assert payload["data"]["books"]
