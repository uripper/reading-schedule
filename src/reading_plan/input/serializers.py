"""Utilities for serializers."""

from __future__ import annotations

from typing import TYPE_CHECKING

from reading_plan.planner_types import WEEKDAYS

if TYPE_CHECKING:
    from reading_plan.planner_types import Book, Settings


def book_to_data(book: Book) -> dict[str, object]:
    """Serialize a Book model into a JSON-safe dictionary for UI/API use."""
    words_total = (
        book.words_total if book.words_full is None else book.words_full
    )
    deadline = book.deadline.isoformat() if book.deadline else None
    return {
        "book_id": book.book_id,
        "title": book.title,
        "words_total": words_total,
        "priority": book.priority,
        "difficulty": book.difficulty,
        "deadline": deadline,
        "min_blocks_per_session": book.min_blocks_per_session,
        "progress_percent": book.progress_percent,
        "words_remaining": book.words_total,
        "max_minutes_per_day": book.max_minutes_per_day,
        "blocked_by": book.blocked_by,
        "scheduled_days": [
            day for day in WEEKDAYS if day in book.scheduled_days
        ],
    }


def settings_to_data(settings: Settings) -> dict[str, object]:
    """Serialize Settings into a JSON-safe dictionary for UI/API use."""
    return {
        "start_date": settings.start_date.isoformat(),
        "end_date": settings.end_date.isoformat(),
        "minutes_per_day": settings.minutes_per_day,
        "minutes_by_weekday": settings.minutes_by_weekday,
        "days_off": sorted(d.isoformat() for d in settings.days_off),
        "wpm_base": settings.wpm_base,
        "time_quantum_minutes": settings.time_quantum_minutes,
        "max_sessions_per_day": settings.max_sessions_per_day,
        "max_books_per_day": settings.max_books_per_day,
        "w_finish": settings.w_finish,
        "w_priority": settings.w_priority,
        "w_switch": settings.w_switch,
        "w_smooth": settings.w_smooth,
        "max_blocks_per_book_per_day": settings.max_blocks_per_book_per_day,
        "plan_mode": settings.plan_mode,
        "difficulty_multiplier": {
            str(k): v for k, v in settings.difficulty_multiplier.items()
        },
    }
