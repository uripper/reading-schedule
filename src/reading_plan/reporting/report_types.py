"""Utilities for report types."""

from __future__ import annotations

from typing import TypedDict


class BookProgress(TypedDict):
    """Book-level progress values used in summary reports."""

    title: str
    planned_words: int
    remaining_words: int
    finished: bool


class Summary(TypedDict):
    """Top-level planner summary payload."""

    planner: str
    status: str
    objective: int | None
    note: str
    total_planned_minutes: int
    total_available_minutes: int
    total_required_minutes: int
    feasibility_warning: str
    per_book: dict[str, BookProgress]
