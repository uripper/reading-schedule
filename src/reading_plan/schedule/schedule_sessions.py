"""Expand block assignments into concrete reading sessions and word counts."""

from dataclasses import dataclass
from datetime import date
import math
from typing import TYPE_CHECKING

from reading_plan.planner_types import Book
from reading_plan.planning.budget import words_per_block, words_per_minute
from reading_plan.reading_calendar import date_range


if TYPE_CHECKING:
    from collections.abc import Iterator

    from reading_plan.planner_types import Settings
    from reading_plan.planning.model_types import Assignments

Session = tuple[date, int, Book, int, int]
SessionRequest = tuple[int, int]


@dataclass
class DaySessionContext:
    """Mutable state used while yielding one day's sessions."""

    book_map: dict[str, Book]
    remaining: dict[str, int]
    settings: Settings


def clip_session(
    book: Book,
    settings: Settings,
    request: SessionRequest,
) -> SessionRequest:
    """Clip session."""
    blocks, remaining_words = request
    if remaining_words <= 0:
        return 0, 0
    max_minutes = blocks * settings.time_quantum_minutes
    max_words = blocks * words_per_block(book, settings)
    words = min(max_words, remaining_words)
    if words <= 0:
        return 0, 0
    minutes = min(
        max_minutes, math.ceil(words / words_per_minute(book, settings))
    )
    return minutes, words


def _day_assignment_items(
    assignments: Assignments,
    book_map: dict[str, Book],
    day: date,
) -> list[tuple[str, int]]:
    """Return positive assignments for one day in display order."""
    items = [
        (book_id, blocks)
        for (book_id, assigned_day), blocks in assignments.items()
        if assigned_day == day and blocks > 0
    ]
    items.sort(key=lambda row: (book_map[row[0]].priority, row[0]))
    return items


def _iter_day_sessions(
    context: DaySessionContext,
    day: date,
    items: list[tuple[str, int]],
) -> Iterator[Session]:
    """Yield the concrete sessions assigned on a single day."""
    index = 0
    for book_id, blocks in items:
        book = context.book_map[book_id]
        minutes, words = clip_session(
            book,
            context.settings,
            (blocks, context.remaining[book_id]),
        )
        if words <= 0:
            continue
        context.remaining[book_id] -= words
        index += 1
        yield day, index, book, minutes, words


def iter_sessions(
    books: list[Book],
    settings: Settings,
    assignments: Assignments,
) -> Iterator[Session]:
    """Iterate over sessions."""
    context = DaySessionContext(
        book_map={book.book_id: book for book in books},
        remaining={book.book_id: book.remaining_words for book in books},
        settings=settings,
    )
    for day in date_range(settings.start_date, settings.end_date):
        items = _day_assignment_items(assignments, context.book_map, day)
        yield from _iter_day_sessions(context, day, items)
