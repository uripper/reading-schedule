"""Normalize raw settings payloads into validated planner settings models."""

from datetime import UTC, datetime
from time import time
from typing import TYPE_CHECKING

from reading_plan.input.builders_coerce import to_float, to_int
from reading_plan.input.validate import validate_settings
from reading_plan.planner_types import (
    DEFAULT_DIFFICULTY_MULTIPLIER,
    PLAN_MODE_FINISH_SOON,
    Settings,
)
from reading_plan.reading_calendar import parse_date


if TYPE_CHECKING:
    from datetime import date

    from src.reading_plan.api_types import SettingsData


def _minutes_by_weekday(data: SettingsData) -> dict[str, int]:
    """Normalize per-weekday reading minutes."""
    return {
        key[:3].title(): int(value)
        for key, value in (data.get("minutes_by_weekday") or {}).items()
    }


def _difficulty_multiplier(data: SettingsData) -> dict[int, float]:
    """Normalize difficulty multiplier weights."""
    raw_diff = data.get("difficulty_multiplier", DEFAULT_DIFFICULTY_MULTIPLIER)
    return {int(key): float(value) for key, value in raw_diff.items()}


def _start_date(data: SettingsData) -> date:
    """Return explicit or default planning start date."""
    start_date = datetime.fromtimestamp(time(), UTC).astimezone().date()
    return (
        parse_date(data["start_date"]) if data.get("start_date") else start_date
    )


def _default_minutes_per_day(by_weekday: dict[str, int]) -> int:
    """Return fallback daily minutes from weekday defaults."""
    return int(sum(by_weekday.values()) / len(by_weekday) if by_weekday else 0)


def _minutes_per_day(
    data: SettingsData,
    by_weekday: dict[str, int],
) -> int:
    """Normalize explicit or derived minutes-per-day value."""
    minutes_per_day = data.get("minutes_per_day")
    if minutes_per_day is None:
        return _default_minutes_per_day(by_weekday)
    if minutes_per_day in {"", None}:
        msg = "minutes_per_day cannot be empty. Provide a number."
        raise ValueError(msg)
    return to_int(minutes_per_day, "minutes_per_day")


def _plan_mode(data: SettingsData) -> str:
    """Normalize the planner mode value."""
    return (
        str(
            data.get("plan_mode", PLAN_MODE_FINISH_SOON)
            or PLAN_MODE_FINISH_SOON
        )
        .strip()
        .lower()
    )


def settings_from_data(data: SettingsData) -> Settings:
    """Normalize raw settings payload data into a validated Settings model.

    :param data: raw settings payload with mixed fields and formats
    :return: validated Settings model with normalized fields
    """
    by_weekday = _minutes_by_weekday(data)
    settings = Settings(
        start_date=_start_date(data),
        end_date=parse_date(data["end_date"]),
        minutes_per_day=_minutes_per_day(data, by_weekday),
        minutes_by_weekday=by_weekday,
        days_off={parse_date(d) for d in data.get("days_off", []) or []},
        wpm_base=to_int(data["wpm_base"], "wpm_base"),
        time_quantum_minutes=to_int(
            data.get("time_quantum_minutes", 15), "time_quantum_minutes"
        ),
        max_sessions_per_day=to_int(
            data.get("max_sessions_per_day", 2), "max_sessions_per_day"
        ),
        max_books_per_day=to_int(
            data.get("max_books_per_day", 2), "max_books_per_day"
        ),
        w_finish=to_float(data.get("w_finish", 5.0), "w_finish"),
        w_priority=to_float(data.get("w_priority", 5.0), "w_priority"),
        w_switch=to_float(data.get("w_switch", 0.0), "w_switch"),
        w_smooth=to_float(data.get("w_smooth", 0.0), "w_smooth"),
        difficulty_multiplier=_difficulty_multiplier(data),
        max_blocks_per_book_per_day=to_int(
            data.get("max_blocks_per_book_per_day", 12),
            "max_blocks_per_book_per_day",
        ),
        plan_mode=_plan_mode(data),
    )
    validate_settings(settings)
    return settings
