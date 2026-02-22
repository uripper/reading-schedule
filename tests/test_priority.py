"""Test cases for test priority."""

from __future__ import annotations

from datetime import date

from reading_plan.planning.greedy import plan_greedy
from reading_plan.types import Book
from tests.helpers import demo_settings


def test_greedy_uses_priority_one_as_highest() -> None:
    """Test that greedy uses priority one as highest."""
    books = [
        Book("high", "High", 20000, 1, 3, None, 1),
        Book("low", "Low", 20000, 5, 3, None, 1),
    ]
    settings = demo_settings(
        start_date=date(2026, 2, 16),
        end_date=date(2026, 2, 16),
        minutes_per_day=15,
        max_books_per_day=1,
        max_sessions_per_day=1,
        time_quantum_minutes=15,
    )
    assignments = plan_greedy(books, settings)
    assert any(
        book_id == "high" and blocks > 0
        for (book_id, _day), blocks in assignments.items()
    )
    assert all(
        book_id != "low" or blocks == 0
        for (book_id, _day), blocks in assignments.items()
    )
