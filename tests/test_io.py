"""Test cases for test io."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from reading_plan.io import load_inputs


def test_load_inputs_parses_books_and_settings(tmp_path: Path) -> None:
    """Test that load inputs parses books and settings."""
    books = tmp_path / "books.csv"
    books.write_text(
        "book_id,title,words_total,priority,difficulty,deadline,min_blocks_per_session\n"
        "b1,One,12000,5,2,2026-02-20,2\n"
        "b2,Two,9000,3,4,,3\n",
        encoding="utf-8",
    )
    settings = tmp_path / "settings.json"
    settings.write_text(
        json.dumps(
            {
                "start_date": "2026-02-16",
                "end_date": "2026-02-20",
                "minutes_per_day": 60,
                "days_off": ["2026-02-19"],
                "wpm_base": 250,
            }
        ),
        encoding="utf-8",
    )
    loaded_books, loaded_settings = load_inputs(str(books), str(settings))
    assert len(loaded_books) == 2
    assert loaded_books[0].deadline is not None and loaded_books[0].deadline.isoformat() == "2026-02-20"
    assert loaded_books[1].min_blocks_per_session == 3
    assert loaded_settings.minutes_per_day == 60
    assert len(loaded_settings.days_off) == 1


def test_load_inputs_rejects_invalid_weekday_map(tmp_path: Path) -> None:
    """Test that load inputs rejects invalid weekday map."""
    books = tmp_path / "books.csv"
    books.write_text(
        "book_id,title,words_total,priority,difficulty\n"
        "b1,One,12000,5,2\n",
        encoding="utf-8",
    )
    settings = tmp_path / "settings.json"
    settings.write_text(
        json.dumps(
            {
                "start_date": "2026-02-16",
                "end_date": "2026-02-20",
                "minutes_by_weekday": {"Mon": 60},
                "wpm_base": 250,
            }
        ),
        encoding="utf-8",
    )
    with pytest.raises(ValueError):
        load_inputs(str(books), str(settings))
