"""Provide small date helpers used across parsing, planning, and reporting."""

from datetime import date, timedelta

from reading_plan.planner_types import WEEKDAYS


def parse_date(value: str) -> date:
    """Return a parsed ISO calendar date."""
    return date.fromisoformat(value)


def date_range(start: date, end: date) -> list[date]:
    """Return inclusive calendar days from ``start`` through ``end``.

    Raises:
        ValueError: If ``end`` is earlier than ``start``.
    """
    if end < start:
        msg = "end_date must be on or after start_date"
        raise ValueError(msg)
    days = (end - start).days + 1
    return [start + timedelta(days=i) for i in range(days)]


def weekday_key(day: date) -> str:
    """Return the planner weekday key (Mon..Sun) for a date."""
    return WEEKDAYS[day.weekday()]
