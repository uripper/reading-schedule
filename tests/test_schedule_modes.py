"""Test cases for test schedule modes."""

from __future__ import annotations

from datetime import date

from reading_plan.planning.greedy import plan_greedy
from reading_plan.types import Book
from tests.helpers import demo_settings


def test_spread_mode_uses_later_days_than_finish_mode() -> None:
    """Test that spread mode uses later days than finish mode."""
    books = [Book("b1", "Long", 90000, 1, 1, None, 1)]
    finish_settings = demo_settings(
        start_date=date(2026, 2, 16),
        end_date=date(2026, 2, 20),
        minutes_per_day=120,
        time_quantum_minutes=15,
        plan_mode="finish_soon",
    )
    spread_settings = demo_settings(
        start_date=date(2026, 2, 16),
        end_date=date(2026, 2, 20),
        minutes_per_day=120,
        time_quantum_minutes=15,
        plan_mode="spread_out",
    )
    finish_assignments = plan_greedy(books, finish_settings)
    spread_assignments = plan_greedy(books, spread_settings)

    finish_last_day_blocks = finish_assignments.get(("b1", finish_settings.end_date), 0)
    spread_last_day_blocks = spread_assignments.get(("b1", spread_settings.end_date), 0)
    assert finish_last_day_blocks == 0
    assert spread_last_day_blocks > 0
