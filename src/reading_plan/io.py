"""Utilities for io."""

from __future__ import annotations

import csv
import json
from pathlib import Path

from .builders import book_from_data, settings_from_data
from .types import Book, Settings


def load_books(path: str) -> list[Book]:
    """Load books."""
    books: list[Book] = []
    with Path(path).open(newline="", encoding="utf-8") as f:
        books.extend(book_from_data(dict(row)) for row in csv.DictReader(f))
    if not books:
        raise ValueError("books file is empty")
    return books


def load_settings(path: str) -> Settings:
    """Load settings."""
    raw = json.loads(Path(path).read_text(encoding="utf-8"))
    return settings_from_data(raw)


def load_inputs(books_path: str, settings_path: str) -> tuple[list[Book], Settings]:
    """Load inputs."""
    return load_books(books_path), load_settings(settings_path)
