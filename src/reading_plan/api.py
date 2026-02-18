from __future__ import annotations

from .builders import book_from_data, settings_from_data
from .report import build_summary
from .schedule import to_schedule_rows
from .solve import solve_plan


def generate_plan(payload: dict[str, object]) -> dict[str, object]:
    books_raw = payload.get("books")
    settings_raw = payload.get("settings")
    if not isinstance(books_raw, list) or not isinstance(settings_raw, dict):
        raise ValueError("payload requires books[] and settings object")

    books = []
    for idx, row in enumerate(books_raw):
        if not isinstance(row, dict):
            raise ValueError(f"book at index {idx} must be an object")
        books.append(book_from_data(row))

    settings = settings_from_data(settings_raw)
    planner = str(payload.get("planner", "mip"))
    result = solve_plan(books, settings, planner=planner)
    return {
        "summary": build_summary(books, settings, result),
        "schedule": to_schedule_rows(books, settings, result.assignments),
    }
