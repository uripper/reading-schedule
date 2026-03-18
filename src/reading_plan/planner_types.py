"""Define the core planner models, constants, and default scheduling data.

The data classes in this module are normalized domain models used after JSON
payload parsing. They are intentionally stricter than API boundary types.
"""

from dataclasses import dataclass, field
from typing import TYPE_CHECKING


if TYPE_CHECKING:
    from datetime import date

    from reading_plan.planning.model_types import Assignments

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
    """Return the default scheduled-day set containing every weekday.

    Returns:
        Frozen set of all weekday abbreviations.
    """
    return frozenset(WEEKDAYS)


@dataclass
class Book:
    """A normalized book input for planning.

    Instances are created by parser/builders after boundary payload
    validation and are used by all solver strategies.
    """

    # Stable identifier used across planning, storage, and UI layers.
    book_id: str
    # Human-readable book title shown in the app and reports.
    title: str
    # Remaining words left to schedule after applying current progress.
    remaining_words: int
    # Relative importance where lower numbers mean higher priority.
    priority: int
    # Reading difficulty bucket used to scale reading speed.
    difficulty: int
    # Optional date by which the book should be finished.
    deadline: date | None = None
    # Minimum block count required when starting a session for this book.
    min_blocks_per_session: int = 1
    # Total book word count before progress is subtracted.
    words_total: int | None = None
    # Percent of the book that has already been read.
    progress_percent: float = 0.0
    # Optional per-day reading cap for this specific book.
    max_minutes_per_day: int | None = None
    # Optional blocker book that must finish first.
    blocked_by: str | None = None
    # Weekdays when this book is allowed to be scheduled.
    scheduled_days: frozenset[str] = field(
        default_factory=default_scheduled_days
    )


@dataclass
class Settings:
    """Planner configuration and scheduling constraints.

    These settings are solver-facing and assume date parsing and shape
    validation have already completed.
    """

    # First date included in the planning window.
    start_date: date
    # Last date included in the planning window.
    end_date: date
    # Default minutes available on days without an override.
    minutes_per_day: int | None
    # Optional per-weekday minute overrides keyed by weekday name.
    minutes_by_weekday: dict[str, int]
    # Calendar dates that should have no reading scheduled.
    days_off: set[date]
    # Baseline reading speed in words per minute before difficulty scaling.
    wpm_base: int
    # Size of one schedulable planning block in minutes.
    time_quantum_minutes: int
    # Maximum number of sessions that can be scheduled on one day.
    max_sessions_per_day: int
    # Maximum number of distinct books that can appear on one day.
    max_books_per_day: int
    # Objective weight for rewarding completed books.
    w_finish: float
    # Objective weight for prioritizing higher-priority books.
    w_priority: float
    # Objective weight for encouraging or discouraging book switching.
    w_switch: float
    # Objective weight used by spread-out mode smoothing behavior.
    w_smooth: float
    # Difficulty multiplier lookup for difficulty levels 1 through 10.
    difficulty_multiplier: dict[int, float]
    # Maximum number of blocks one book can receive in a single day.
    max_blocks_per_book_per_day: int = 12
    # Planner mode that controls how work is distributed across days.
    plan_mode: str = PLAN_MODE_FINISH_SOON


@dataclass
class PlanResult:
    """Solver output assignments and metadata.

    ``assignments`` contains the canonical schedule map consumed by reporting
    and schedule-row serialization layers.
    """

    # Name of the planner implementation that produced this result.
    planner: str
    # High-level solver outcome such as OPTIMAL or INFEASIBLE.
    status: str
    # Scheduled block counts keyed by book id and calendar day.
    assignments: Assignments
    # Optional solver objective value when one is available.
    objective: int | None = None
    # Extra human-readable context about fallback or infeasibility.
    note: str = ""
