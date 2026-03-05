"""Validation helpers for persisted mobile planner state."""

from __future__ import annotations

from typing import cast

VALID_THEMES = {"system", "light", "dark"}
REQUIRED_FEATURE_FLAGS = (
    "gamificationEnabled",
    "recommendationsEnabled",
    "socialEnabled",
)


def _is_bool_record(value: object) -> bool:
    if not isinstance(value, dict):
        return False
    value_map = cast("dict[str, object]", value)
    return all(isinstance(item, bool) for item in value_map.values())


def _is_feature_flags(value: object) -> bool:
    if not isinstance(value, dict):
        return False
    value_map = cast("dict[str, object]", value)
    return all(
        isinstance(value_map.get(key, False), bool)
        for key in REQUIRED_FEATURE_FLAGS
    )


def _is_preferences(value: object) -> bool:
    if not isinstance(value, dict):
        return False
    value_map = cast("dict[str, object]", value)
    checks = (
        isinstance(value_map.get("dailyGoalMinutes", 30), int),
        isinstance(value_map.get("reduceMotion", False), bool),
        isinstance(value_map.get("reminderEnabled", False), bool),
        isinstance(value_map.get("reminderTime", "08:00"), str),
        isinstance(value_map.get("timezone", "UTC"), str),
    )
    if not all(checks):
        return False
    theme = value_map.get("theme", "dark")
    return isinstance(theme, str) and theme in VALID_THEMES


def _raise_state_type_error(message: str) -> None:
    error_message = message
    raise TypeError(error_message)


def _require_state_field(*, is_valid: bool, message: str) -> None:
    if is_valid:
        return
    _raise_state_type_error(message)


def validate_state_snapshot(state: object) -> dict[str, object]:
    """Validate mobile state payload shape against shared planner contracts."""
    _require_state_field(
        is_valid=isinstance(state, dict),
        message="Saved state payload must be an object.",
    )
    state_map = cast("dict[str, object]", state)
    field_checks = (
        (
            isinstance(state_map.get("books"), list),
            "Saved state payload has invalid books list.",
        ),
        (
            isinstance(state_map.get("settings"), dict),
            "Saved state payload has invalid settings object.",
        ),
        (
            isinstance(state_map.get("sessions"), list),
            "Saved state payload has invalid sessions list.",
        ),
        (
            _is_bool_record(state_map.get("schedule_completions")),
            "Saved state payload has invalid schedule_completions.",
        ),
        (
            _is_bool_record(state_map.get("blocked_day_books")),
            "Saved state payload has invalid blocked_day_books.",
        ),
        (
            _is_feature_flags(state_map.get("feature_flags")),
            "Saved state payload has invalid feature_flags.",
        ),
        (
            _is_preferences(state_map.get("preferences")),
            "Saved state payload has invalid preferences.",
        ),
    )
    for is_valid, message in field_checks:
        _require_state_field(is_valid=is_valid, message=message)

    last_result = state_map.get("last_result")
    _require_state_field(
        is_valid=last_result is None or isinstance(last_result, dict),
        message="Saved state payload has invalid last_result.",
    )
    return state_map
