"""Test cases for helpers."""

from __future__ import annotations

from datetime import date

from reading_plan.types import DEFAULT_DIFFICULTY_MULTIPLIER, Book, Settings


def demo_books() -> list[Book]:
    """Execute demo books."""
    return [
        Book("b1", "Book One", 12000, 5, 2, None, 2),
        Book("b2", "Book Two", 10000, 4, 3, None, 2),
        Book("b3", "Book Three", 9000, 2, 1, None, 2),
    ]


def demo_settings(**overrides: object) -> Settings:
    """Execute demo settings."""
    base = Settings(
        start_date=date(2026, 2, 16),
        end_date=date(2026, 2, 20),
        minutes_per_day=60,
        minutes_by_weekday={},
        days_off=set(),
        wpm_base=250,
        time_quantum_minutes=15,
        max_sessions_per_day=2,
        max_books_per_day=2,
        w_finish=5.0,
        w_priority=5.0,
        w_switch=10.0,
        w_smooth=0.0,
        difficulty_multiplier=DEFAULT_DIFFICULTY_MULTIPLIER,
        max_blocks_per_book_per_day=12,
    )
    if not overrides:
        return base
    data = base.__dict__ | overrides
    return Settings(**data)
