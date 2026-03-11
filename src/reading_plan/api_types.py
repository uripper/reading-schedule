"""Shared API payload types."""

from typing import TYPE_CHECKING, TypedDict

if TYPE_CHECKING:
    from reading_plan.reporting.report_types import Summary


class BookData(TypedDict, total=False):
    """Book data structure in plan input/output payloads."""

    book_id: str
    title: str
    remaining_words: int | None
    priority: int
    difficulty: int
    deadline: str | None
    min_blocks_per_session: int
    progress_percent: float
    words_full: int | None
    max_minutes_per_day: int | None
    blocked_by: str | None
    scheduled_days: list[str]


class SettingsData(TypedDict):
    """Settings data structure in plan input/output payloads."""

    start_date: str
    end_date: str
    minutes_per_day: int | None
    minutes_by_weekday: dict[str, int]
    days_off: list[str] | None
    wpm_base: int
    time_quantum_minutes: int
    max_sessions_per_day: int
    max_books_per_day: int
    w_finish: float
    w_priority: float
    w_switch: float
    w_smooth: float
    max_blocks_per_book_per_day: int
    plan_mode: str
    difficulty_multiplier: dict[str, float]


class ScheduleRow(TypedDict):
    """Schedule row in plan output."""

    date: str
    session_index: int
    book_id: str
    title: str
    minutes: int
    words_planned: int


class _PlannerInputRequired(TypedDict):
    """Required fields for planner input."""

    books: list[BookData]
    settings: SettingsData


class PlannerInputPayload(_PlannerInputRequired, total=False):
    """Input payload for plan generation with optional planner selection."""

    planner: str


class PlannerOutputPayload(TypedDict):
    """Output payload from plan generation."""

    summary: "Summary"
    schedule: list[ScheduleRow]
