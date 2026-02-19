"""Utilities for calendar."""

from __future__ import annotations

from datetime import date, datetime, timedelta

from .types import WEEKDAYS


def parse_date(value: str) -> date:
    """Parse date."""
    return datetime.strptime(value, "%Y-%m-%d").date()


def date_range(start: date, end: date) -> list[date]:
    """Return inclusive start/end calendar days, raising on inverted ranges."""
    if end < start:
        raise ValueError("end_date must be on or after start_date")
    days = (end - start).days + 1
    return [start + timedelta(days=i) for i in range(days)]


def weekday_key(day: date) -> str:
    """Return the planner weekday key (Mon..Sun) for a date."""
    return WEEKDAYS[day.weekday()]
