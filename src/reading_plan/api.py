"""Utilities for api."""

from __future__ import annotations

from typing import TYPE_CHECKING

from reading_plan.input.builders import book_from_data, settings_from_data
from reading_plan.planning.solve import solve_plan
from reading_plan.reporting.report import build_summary
from reading_plan.schedule.schedule import to_schedule_rows

if TYPE_CHECKING:
    from reading_plan.planner_types import Book


def _validate_missing_blockers(
    books: list[Book],
    by_id: dict[str, Book],
) -> None:
    """Validate blocker references point to known books."""
    for book in books:
        if not book.blocked_by:
            continue
        if book.blocked_by in by_id:
            continue
        message = (
            f"book {book.book_id} is blocked by missing book_id "
            f"{book.blocked_by}"
        )
        raise ValueError(message)


def _walk_blockers(
    book_id: str,
    by_id: dict[str, Book],
    visiting: set[str],
    visited: set[str],
) -> None:
    """Traverse blocker ancestry for one book and detect cycles."""
    if book_id in visited:
        return
    if book_id in visiting:
        msg = "blockers contain a cycle; remove circular dependencies"
        raise ValueError(msg)
    visiting.add(book_id)
    if blocker := by_id[book_id].blocked_by:
        _walk_blockers(blocker, by_id, visiting, visited)
    visiting.remove(book_id)
    visited.add(book_id)


def _validate_blockers(books: list[Book]) -> None:
    """Validate blocker references and reject cycles in dependency chains."""
    by_id = {book.book_id: book for book in books}
    _validate_missing_blockers(books, by_id)

    visiting: set[str] = set()
    visited: set[str] = set()
    for book in books:
        _walk_blockers(book.book_id, by_id, visiting, visited)


def generate_plan(payload: dict[str, object]) -> dict[str, object]:
    """Validate inputs, solve the plan, and return summary plus schedule."""
    books_raw = payload.get("books")
    settings_raw = payload.get("settings")
    if not isinstance(books_raw, list) or not isinstance(settings_raw, dict):
        msg = "payload requires books[] and settings object"
        raise TypeError(msg)

    books = []
    for idx, row in enumerate(books_raw):
        if not isinstance(row, dict):
            msg = f"book at index {idx} must be an object"
            raise TypeError(msg)
        books.append(book_from_data(row))
    _validate_blockers(books)

    settings = settings_from_data(settings_raw)
    planner = str(payload.get("planner", "mip"))
    result = solve_plan(books, settings, planner=planner)
    return {
        "summary": build_summary(books, settings, result),
        "schedule": to_schedule_rows(books, settings, result.assignments),
    }
