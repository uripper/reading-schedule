"""Utilities for api."""

from __future__ import annotations

from typing import TYPE_CHECKING, TypedDict

from reading_plan.input.builders import book_from_data, settings_from_data
from reading_plan.planning.solve import solve_plan
from reading_plan.reporting.report import build_summary
from reading_plan.schedule.schedule import to_schedule_rows

if TYPE_CHECKING:
    from reading_plan.planner_types import Book, Settings
    from reading_plan.reporting.report_types import Summary


class BookData(TypedDict, total=False):
    """Book data structure in plan input/output payloads."""

    book_id: str
    title: str
    words_total: int | None
    priority: int
    difficulty: int
    deadline: str | None
    min_blocks_per_session: int
    progress_percent: float
    words_remaining: int
    max_minutes_per_day: int | None
    blocked_by: str | None
    scheduled_days: list[str]


class SettingsData(TypedDict, total=False):
    """Settings data structure in plan input/output payloads."""

    start_date: str
    end_date: str
    minutes_per_day: int
    minutes_by_weekday: dict[str, int]
    days_off: list[str]
    wpm_base: int
    time_quantum_minutes: int
    max_sessions_per_day: int
    max_books_per_day: int
    w_finish: float
    w_priority: float
    w_switch: float
    w_smooth: float
    max_blocks_per_book_per_day: int
    plan_mode: str
    difficulty_multiplier: dict[str, float]


class ScheduleRow(TypedDict):
    """Schedule row in plan output."""

    date: str
    session_index: int
    book_id: str
    title: str
    minutes: int
    words_planned: int


class _PlannerInputRequired(TypedDict):
    """Required fields for planner input."""

    books: list[BookData]
    settings: SettingsData


class PlannerInputPayload(_PlannerInputRequired, total=False):
    """Input payload for plan generation with optional planner selection."""

    planner: str


class PlannerOutputPayload(TypedDict):
    """Output payload from plan generation."""

    summary: Summary
    schedule: list[ScheduleRow]


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


def generate_plan(payload: PlannerInputPayload) -> PlannerOutputPayload:
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

    settings: Settings = settings_from_data(settings_raw)
    planner = str(payload.get("planner", "mip"))
    result = solve_plan(books, settings, planner=planner)
    return {
        "summary": build_summary(books, settings, result),
        "schedule": to_schedule_rows(books, settings, result.assignments),
    }
