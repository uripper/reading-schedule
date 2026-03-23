"""Shared API payload contracts used by bridge and HTTP surfaces.

These ``TypedDict`` definitions model JSON boundary payloads exchanged between
UI clients and planner backends. Validation is performed by parser and builder
layers; this module defines the stable structural contract.
"""

from typing import TYPE_CHECKING, NotRequired, TypedDict


if TYPE_CHECKING:
    from reading_plan.reporting.report_types import Summary


class BookData(TypedDict, total=False):
    """Book row shape accepted by planner API entry points.

    All fields are optional at this boundary to support incremental migration
    from desktop and mobile clients with partially populated payloads.
    """

    author: str
    book_id: str
    title: str
    blocked_by: str | None
    blocker_book_id: str | None
    deadline: str | None
    priority: int
    difficulty: int
    min_blocks_per_session: int
    max_minutes_per_day: int | None
    pages_read: int | None
    pages_total: int | None
    progress_percent: float
    remaining_words: int | None
    scheduled_days: list[str]
    words_read: int | None
    words_total: int | None


class SettingsData(TypedDict):
    """Settings object shape accepted by planner API entry points."""

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
    planner_solver_profile: NotRequired[str]


class ScheduleRow(TypedDict):
    """One scheduled reading session produced by a planner run."""

    date: str
    session_index: int
    book_id: str
    title: str
    minutes: int
    words_planned: int


class _PlannerInputRequired(TypedDict):
    """Required planner-input fields shared by all planner requests."""

    books: list[BookData]
    settings: SettingsData

class PlannerInputPayload(_PlannerInputRequired):
    """Planner request payload with books and settings."""


class PlannerOutputPayload(TypedDict):
    """Planner response payload with summary and schedule details."""

    summary: Summary
    schedule: list[ScheduleRow]
