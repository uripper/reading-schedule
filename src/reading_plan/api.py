"""Utilities for api."""

from __future__ import annotations

import logging
from time import perf_counter
from typing import TYPE_CHECKING, Any, cast

from reading_plan.api_types import (
    BookData,
    PlannerInputPayload,
    PlannerOutputPayload,
    ScheduleRow,
    SettingsData,
)
from reading_plan.input.builders import book_from_data, settings_from_data
from reading_plan.planning.solve import solve_plan
from reading_plan.reporting.report import build_summary
from reading_plan.schedule.schedule import to_schedule_rows

__all__ = [
    "BookData",
    "PlannerInputPayload",
    "PlannerOutputPayload",
    "ScheduleRow",
    "SettingsData",
    "generate_plan",
]

if TYPE_CHECKING:
    from collections.abc import Mapping

    from reading_plan.planner_types import Book, PlanResult, Settings


LOGGER = logging.getLogger("reading_plan.bridge")


def _elapsed_ms(started_at: float) -> int:
    """Return elapsed milliseconds from a `perf_counter` timestamp."""
    return int((perf_counter() - started_at) * 1000)


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


def _parse_books(books_raw: list[BookData]) -> list[Book]:
    """Parse and validate incoming raw book payload rows."""
    parse_started = perf_counter()
    books: list[Book] = []
    for idx, row in enumerate(books_raw):
        if not isinstance(row, dict):
            msg = f"book at index {idx} must be an object"
            raise TypeError(msg)
        row_mapping = cast("Mapping[str, Any]", row)
        books.append(book_from_data(row_mapping))
    LOGGER.debug(
        "generate_plan: books parsed",
        extra={"elapsed_ms": _elapsed_ms(parse_started)},
    )
    return books


def _validate_blockers_with_logging(books: list[Book]) -> None:
    """Validate blocker graph and emit stage timing."""
    started = perf_counter()
    _validate_blockers(books)
    LOGGER.debug(
        "generate_plan: blockers validated",
        extra={"elapsed_ms": _elapsed_ms(started)},
    )


def _parse_settings(settings_raw: SettingsData) -> Settings:
    """Parse planner settings payload and emit stage timing."""
    started = perf_counter()
    settings_mapping = cast("Mapping[str, Any]", settings_raw)
    settings = settings_from_data(settings_mapping)
    LOGGER.debug(
        "generate_plan: settings parsed",
        extra={"elapsed_ms": _elapsed_ms(started)},
    )
    return settings


def _solve_with_logging(
    books: list[Book],
    planner: str,
    settings: Settings,
) -> PlanResult:
    """Run solver and emit timing/status diagnostics."""
    started = perf_counter()
    LOGGER.debug("generate_plan: solving started", extra={"planner": planner})
    result = solve_plan(books, settings, planner=planner)
    LOGGER.debug(
        "generate_plan: solving completed",
        extra={
            "assignment_count": len(result.assignments),
            "elapsed_ms": _elapsed_ms(started),
            "planner_used": result.planner,
            "result_note": result.note,
            "status": result.status,
        },
    )
    return result


def _build_output_with_logging(
    books: list[Book],
    result: PlanResult,
    settings: Settings,
    total_started: float,
) -> PlannerOutputPayload:
    """Build summary/schedule payload and emit timings."""
    summary_started = perf_counter()
    summary = build_summary(books, settings, result)
    LOGGER.debug(
        "generate_plan: summary built",
        extra={"elapsed_ms": _elapsed_ms(summary_started)},
    )

    schedule_started = perf_counter()
    schedule = to_schedule_rows(books, settings, result.assignments)
    LOGGER.debug(
        "generate_plan: schedule rows built",
        extra={
            "elapsed_ms": _elapsed_ms(schedule_started),
            "row_count": len(schedule),
            "total_elapsed_ms": _elapsed_ms(total_started),
        },
    )
    return {
        "summary": summary,
        "schedule": schedule,
    }


def generate_plan(payload: PlannerInputPayload) -> PlannerOutputPayload:
    """Validate inputs, solve the plan, and return summary plus schedule."""
    start_time = perf_counter()
    LOGGER.debug("generate_plan: started")

    books_raw = payload.get("books")
    settings_raw = payload.get("settings")
    if not isinstance(books_raw, list) or not isinstance(settings_raw, dict):
        msg = "payload requires books[] and settings object"
        raise TypeError(msg)
    LOGGER.debug(
        "generate_plan: payload shape validated",
        extra={"book_count": len(books_raw)},
    )

    books = _parse_books(books_raw)
    _validate_blockers_with_logging(books)
    settings = _parse_settings(settings_raw)

    planner = str(payload.get("planner", "mip"))
    result = _solve_with_logging(books, planner, settings)
    return _build_output_with_logging(books, result, settings, start_time)
