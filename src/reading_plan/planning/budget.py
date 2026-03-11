"""Utilities for budget."""

from __future__ import annotations

import math
from typing import TYPE_CHECKING

from reading_plan.reading_calendar import date_range, weekday_key

if TYPE_CHECKING:
    from datetime import date

    from reading_plan.planner_types import Book, Settings


def minutes_for_day(settings: Settings, day: date) -> int:
    """Return reading minutes for one day after days-off and overrides."""
    if day in settings.days_off:
        return 0
    if settings.minutes_by_weekday:
        return settings.minutes_by_weekday.get(weekday_key(day), 0)
    return settings.minutes_per_day or 0


def calendar_minutes(settings: Settings) -> dict[date, int]:
    """Build available reading minutes for every day in the planning window."""
    return {
        d: minutes_for_day(settings, d)
        for d in date_range(settings.start_date, settings.end_date)
    }


def day_capacity_blocks(settings: Settings, day: date) -> int:
    """Convert one day's minutes into schedulable time-quantum blocks."""
    minutes = minutes_for_day(settings, day)
    return minutes // settings.time_quantum_minutes


def book_day_block_limit(book: Book, settings: Settings) -> int:
    """Return per-book daily block cap with optional book-level minute limit."""
    limit = settings.max_blocks_per_book_per_day
    if book.max_minutes_per_day is not None:
        limit = min(
            limit, book.max_minutes_per_day // settings.time_quantum_minutes
        )
    return max(0, limit)


def book_is_scheduled_for_day(book: Book, day: date) -> bool:
    """Return whether a book can be scheduled on the provided calendar day."""
    return weekday_key(day) in book.scheduled_days


def words_per_minute(book: Book, settings: Settings) -> float:
    """Estimate reading speed using base WPM adjusted by book difficulty."""
    multiplier = settings.difficulty_multiplier[book.difficulty]
    return settings.wpm_base * multiplier


def words_per_block(book: Book, settings: Settings) -> int:
    """Convert estimated reading speed into words per scheduling block."""
    return round(
        words_per_minute(book, settings) * settings.time_quantum_minutes
    )


def required_minutes(book: Book, settings: Settings) -> int:
    """Estimate total minutes required to finish one book."""
    return math.ceil(book.remaining_words / words_per_minute(book, settings))


def required_total_minutes(books: list[Book], settings: Settings) -> int:
    """Estimate total minutes required to finish all books in the list."""
    return sum(required_minutes(book, settings) for book in books)
