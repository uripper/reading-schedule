"""Utilities for types."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from datetime import date

DEFAULT_DIFFICULTY_MULTIPLIER = {
    1: 1.00,
    2: 0.90,
    3: 0.80,
    4: 0.70,
    5: 0.60,
    6: 0.50,
    7: 0.40,
    8: 0.30,
    9: 0.20,
    10: 0.10,
}
WEEKDAYS = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
PLAN_MODE_FINISH_SOON = "finish_soon"
PLAN_MODE_SPREAD_OUT = "spread_out"
PLAN_MODES = (PLAN_MODE_FINISH_SOON, PLAN_MODE_SPREAD_OUT)


def default_scheduled_days() -> frozenset[str]:
    """Return the default scheduled-day set containing every weekday."""
    return frozenset(WEEKDAYS)


@dataclass
class Book:
    """A normalized book input for planning."""

    book_id: str
    title: str
    words_total: int
    priority: int
    difficulty: int
    deadline: date | None = None
    min_blocks_per_session: int = 2
    words_full: int | None = None
    progress_percent: float = 0.0
    max_minutes_per_day: int | None = None
    blocked_by: str | None = None
    scheduled_days: frozenset[str] = field(
        default_factory=default_scheduled_days
    )


@dataclass
class Settings:
    """Planner configuration and scheduling constraints."""

    start_date: date
    end_date: date
    minutes_per_day: int | None
    minutes_by_weekday: dict[str, int]
    days_off: set[date]
    wpm_base: int
    time_quantum_minutes: int
    max_sessions_per_day: int
    max_books_per_day: int
    w_finish: float
    w_priority: float
    w_switch: float
    w_smooth: float
    difficulty_multiplier: dict[int, float]
    max_blocks_per_book_per_day: int = 12
    plan_mode: str = PLAN_MODE_FINISH_SOON


@dataclass
class PlanResult:
    """Solver output assignments and metadata."""

    planner: str
    status: str
    assignments: dict[tuple[str, date], int]
    objective: int | None = None
    note: str = ""
