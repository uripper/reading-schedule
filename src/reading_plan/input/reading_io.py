"""Utilities for io."""

from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import TYPE_CHECKING, cast

from reading_plan.input.builders import settings_from_data

if TYPE_CHECKING:
    from reading_plan.planner_types import Book, Settings


def load_books(path: str) -> list[Book]:
    """Load books.

    :param path: path to the books file
    :return: list of Book models
    """
    books: list[Book] = []
    with Path(path).open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            typed_row = cast("Book", row)
            books.append(typed_row)
    if not books:
        msg = "books file is empty"
        raise ValueError(msg)
    return books


def load_settings(path: str) -> Settings:
    """Load settings.

    :param path: path to the settings file
    :return: Settings model
    """
    raw = json.loads(Path(path).read_text(encoding="utf-8"))
    return settings_from_data(raw)


def load_inputs(
    books_path: str, settings_path: str
) -> tuple[list[Book], Settings]:
    """Load inputs.

    :param books_path: path to the books file
    :param settings_path: path to the settings file
    :return: tuple of list of Book models and Settings model
    """
    return load_books(books_path), load_settings(settings_path)
