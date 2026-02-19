"""Utilities for api."""

from __future__ import annotations

from .builders import book_from_data, settings_from_data
from .report import build_summary
from .schedule import to_schedule_rows
from .solve import solve_plan
from .types import Book


def _validate_blockers(books: list[Book]) -> None:
    """Validate blocker references and reject cycles in dependency chains."""
    by_id = {book.book_id: book for book in books}
    for book in books:
        if not book.blocked_by:
            continue
        if book.blocked_by not in by_id:
            raise ValueError(
                f"book {book.book_id} is blocked by missing book_id {book.blocked_by}"
            )

    visiting: set[str] = set()
    visited: set[str] = set()

    def walk(book_id: str) -> None:
        """Traverse blocker ancestry for one book and detect cycles."""
        if book_id in visited:
            return
        if book_id in visiting:
            raise ValueError("blockers contain a cycle; remove circular dependencies")
        visiting.add(book_id)
        blocker = by_id[book_id].blocked_by
        if blocker:
            walk(blocker)
        visiting.remove(book_id)
        visited.add(book_id)

    for book in books:
        walk(book.book_id)


def generate_plan(payload: dict[str, object]) -> dict[str, object]:
    """Validate payload inputs, solve the plan, and return summary plus schedule."""
    books_raw = payload.get("books")
    settings_raw = payload.get("settings")
    if not isinstance(books_raw, list) or not isinstance(settings_raw, dict):
        raise ValueError("payload requires books[] and settings object")

    books = []
    for idx, row in enumerate(books_raw):
        if not isinstance(row, dict):
            raise ValueError(f"book at index {idx} must be an object")
        books.append(book_from_data(row))
    _validate_blockers(books)

    settings = settings_from_data(settings_raw)
    planner = str(payload.get("planner", "mip"))
    result = solve_plan(books, settings, planner=planner)
    return {
        "summary": build_summary(books, settings, result),
        "schedule": to_schedule_rows(books, settings, result.assignments),
    }
