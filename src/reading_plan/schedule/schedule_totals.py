"""Aggregate scheduled sessions into per-book totals and total minutes."""

from typing import TYPE_CHECKING

from reading_plan.schedule.schedule_sessions import iter_sessions

if TYPE_CHECKING:
    from reading_plan.planner_types import Book, Settings
    from reading_plan.planning.model_types import Assignments


def compute_plan_totals(
    books: "list[Book]",
    settings: "Settings",
    assignments: "Assignments",
) -> "tuple[dict[str, int], int]":
    """Compute plan totals."""
    per_book = {book.book_id: 0 for book in books}
    total_minutes = 0
    for _day, _idx, book, minutes, words in iter_sessions(
        books, settings, assignments
    ):
        per_book[book.book_id] += words
        total_minutes += minutes
    return per_book, total_minutes
