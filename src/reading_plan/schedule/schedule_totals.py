"""Utilities for schedule totals."""

from __future__ import annotations

from datetime import date

from ..types import Book, Settings
from .schedule_sessions import iter_sessions


def compute_plan_totals(
    books: list[Book],
    settings: Settings,
    assignments: dict[tuple[str, date], int],
) -> tuple[dict[str, int], int]:
    """Compute plan totals."""
    per_book = {book.book_id: 0 for book in books}
    total_minutes = 0
    for _day, _idx, book, minutes, words in iter_sessions(
        books, settings, assignments
    ):
        per_book[book.book_id] += words
        total_minutes += minutes
    return per_book, total_minutes
