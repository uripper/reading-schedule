"""Utilities for schedule totals."""

from __future__ import annotations

from typing import TYPE_CHECKING

from reading_plan.schedule.schedule_sessions import iter_sessions

if TYPE_CHECKING:
    from datetime import date

    from reading_plan.planner_types import Book, Settings


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
