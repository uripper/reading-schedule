"""Utilities for calendar."""

from __future__ import annotations

from datetime import date, datetime, timedelta

from .types import WEEKDAYS


def parse_date(value: str) -> date:
    """Parse date."""
    return datetime.strptime(value, "%Y-%m-%d").date()


def date_range(start: date, end: date) -> list[date]:
    """Execute date range."""
    if end < start:
        raise ValueError("end_date must be on or after start_date")
    days = (end - start).days + 1
    return [start + timedelta(days=i) for i in range(days)]


def weekday_key(day: date) -> str:
    """Execute weekday key."""
    return WEEKDAYS[day.weekday()]
