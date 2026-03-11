"""Normalize raw settings payloads into validated planner settings models."""

from datetime import datetime
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
    from src.reading_plan.api_types import SettingsData


def settings_from_data(data: "SettingsData") -> Settings:
    """Normalize raw settings payload data into a validated Settings model.

    :param data: raw settings payload with mixed fields and formats
    :return: validated Settings model with normalized fields
    """
    by_weekday = {
        k[:3].title(): int(v)
        for k, v in (data.get("minutes_by_weekday") or {}).items()
    }
    raw_diff = data.get("difficulty_multiplier", DEFAULT_DIFFICULTY_MULTIPLIER)
    diff = {int(k): float(v) for k, v in raw_diff.items()}
    start_date = datetime.now().astimezone().date()
    if data.get("start_date"):
        start_date = parse_date(data["start_date"])
    minutes_per_day = data.get("minutes_per_day")
    default_minutes_per_day = int(
        sum(by_weekday.values()) / len(by_weekday) if by_weekday else 0
    )
    parsed_minutes_per_day = None
    if minutes_per_day is None:
        parsed_minutes_per_day = default_minutes_per_day
    elif minutes_per_day not in {None, ""}:
        parsed_minutes_per_day = to_int(minutes_per_day, "minutes_per_day")
    else:
        msg = "minutes_per_day cannot be empty. Provide a number."
        raise ValueError(msg)

    settings = Settings(
        start_date=start_date,
        end_date=parse_date(data["end_date"]),
        minutes_per_day=parsed_minutes_per_day,
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
        difficulty_multiplier=diff,
        max_blocks_per_book_per_day=to_int(
            data.get("max_blocks_per_book_per_day", 12),
            "max_blocks_per_book_per_day",
        ),
        plan_mode=str(
            data.get("plan_mode", PLAN_MODE_FINISH_SOON)
            or PLAN_MODE_FINISH_SOON
        )
        .strip()
        .lower(),
    )
    validate_settings(settings)
    return settings
