"""Utilities for schedule rows."""

from __future__ import annotations

from datetime import date

from .schedule_sessions import iter_sessions
from .types import Book, Settings


def to_schedule_rows(
    books: list[Book],
    settings: Settings,
    assignments: dict[tuple[str, date], int],
) -> list[dict[str, object]]:
    """Convert to schedule rows."""
    return [
        {
            "date": day.isoformat(),
            "session_index": idx,
            "book_id": book.book_id,
            "title": book.title,
            "minutes": minutes,
            "words_planned": words,
        }
        for day, idx, book, minutes, words in iter_sessions(books, settings, assignments)
    ]
