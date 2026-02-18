from __future__ import annotations

from typing import Optional, TypedDict


class BookProgress(TypedDict):
    title: str
    planned_words: int
    words_total: int
    finished: bool


class Summary(TypedDict):
    planner: str
    status: str
    objective: Optional[int]
    note: str
    total_planned_minutes: int
    total_available_minutes: int
    total_required_minutes: int
    feasibility_warning: str
    per_book: dict[str, BookProgress]
