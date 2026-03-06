"""Compatibility tests for legacy reading_plan.cli module."""

from __future__ import annotations

import json
from pathlib import Path
import sys

import pytest
from reading_plan.cli import main as cli_main

REPO_ROOT = Path(__file__).resolve().parent.parent


def test_cli_sample_mode_delegates_to_gui_api(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    """Legacy cli module should return an error envelope in sample mode."""
    monkeypatch.chdir(REPO_ROOT)
    monkeypatch.setattr(sys, "argv", ["reading_plan.cli", "--sample"])

    exit_code = cli_main()
    output = capsys.readouterr().out
    payload = json.loads(output)

    assert exit_code == 1
    assert payload["ok"] is False
    assert "words_full" in payload["error"]
