"""Utilities for validate."""

from __future__ import annotations

from typing import TYPE_CHECKING

from reading_plan.planner_types import PLAN_MODES, WEEKDAYS

if TYPE_CHECKING:
    from reading_plan.planner_types import Book, Settings

MIN_PROGRESS_PERCENT = 0
MAX_PROGRESS_PERCENT = 100


def _validate_required_fields(book: Book) -> None:
    """Validate required fields and core range constraints."""
    if not book.book_id or not book.title:
        msg = "book_id and title are required"
        raise ValueError(msg)
    if book.words_total <= 0:
        msg = f"words_total must be > 0 for {book.book_id}"
        raise ValueError(msg)
    if book.priority not in range(1, 6):
        msg = f"priority must be 1..5 for {book.book_id}"
        raise ValueError(msg)
    if book.difficulty not in range(1, 11):
        msg = f"difficulty must be 1..10 for {book.book_id}"
        raise ValueError(msg)
    if book.min_blocks_per_session <= 0:
        msg = f"min_blocks_per_session must be > 0 for {book.book_id}"
        raise ValueError(msg)


def _validate_book_progress(book: Book) -> None:
    """Validate read-progress and words consistency values."""
    if book.words_full is not None and book.words_full < book.words_total:
        msg = f"words_full must be >= remaining words for {book.book_id}"
        raise ValueError(msg)
    if (
        book.progress_percent < MIN_PROGRESS_PERCENT
        or book.progress_percent > MAX_PROGRESS_PERCENT
    ):
        msg = f"progress_percent must be between 0 and 100 for {book.book_id}"
        raise ValueError(msg)


def _validate_book_limits(book: Book) -> None:
    """Validate optional daily limits and blocker invariants."""
    if book.max_minutes_per_day is not None and book.max_minutes_per_day <= 0:
        msg = f"max_minutes_per_day must be > 0 for {book.book_id}"
        raise ValueError(msg)
    if book.blocked_by and book.blocked_by == book.book_id:
        msg = f"book {book.book_id} cannot block itself"
        raise ValueError(msg)


def _validate_scheduled_days(book: Book) -> None:
    """Validate book-level scheduled weekday constraints."""
    if not book.scheduled_days:
        msg = f"scheduled_days must include at least one day for {book.book_id}"
        raise ValueError(msg)
    invalid_days = sorted(
        day for day in book.scheduled_days if day not in WEEKDAYS
    )
    if invalid_days:
        invalid = ", ".join(invalid_days)
        msg = (
            f"scheduled_days must only include Mon..Sun for {book.book_id}: "
            f"{invalid}"
        )
        raise ValueError(msg)


def validate_book(book: Book) -> None:
    """Validate book."""
    _validate_required_fields(book)
    _validate_book_progress(book)
    _validate_book_limits(book)
    _validate_scheduled_days(book)


def validate_settings(settings: Settings) -> None:
    """Validate settings."""
    if settings.end_date < settings.start_date:
        msg = "end_date must be on or after start_date"
        raise ValueError(msg)
    if not settings.minutes_by_weekday and not settings.minutes_per_day:
        msg = "set minutes_per_day or minutes_by_weekday"
        raise ValueError(msg)
    if settings.time_quantum_minutes <= 0:
        msg = "time_quantum_minutes must be > 0"
        raise ValueError(msg)
    if settings.max_sessions_per_day <= 0 or settings.max_books_per_day <= 0:
        msg = "max_sessions_per_day and max_books_per_day must be > 0"
        raise ValueError(msg)
    if sorted(settings.minutes_by_weekday.keys()) not in ([], sorted(WEEKDAYS)):
        msg = "minutes_by_weekday must include Mon..Sun when provided"
        raise ValueError(msg)
    if sorted(settings.difficulty_multiplier.keys()) != list(range(1, 11)):
        msg = "difficulty_multiplier must contain keys 1..10"
        raise ValueError(msg)
    if settings.plan_mode not in PLAN_MODES:
        msg = f"plan_mode must be one of: {', '.join(PLAN_MODES)}"
        raise ValueError(msg)
