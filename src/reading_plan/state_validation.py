"""Validation helpers for persisted mobile planner state.

This module validates only top-level snapshot shape and selected field value
types. Nested planner payload details are validated by downstream modules.
"""

from reading_plan.type_guards import is_str_object_dict


VALID_THEMES = {"system", "light", "dark"}
REQUIRED_FEATURE_FLAGS = (
    "gamificationEnabled",
    "recommendationsEnabled",
    "socialEnabled",
)


def _is_bool_record(value: object) -> bool:
    """Return whether a payload field is a string-keyed bool mapping.

    The persisted mobile snapshot stores several per-day and per-book toggles
    as object maps, so this helper centralizes the "all values must be bool"
    rule used by those fields.

    Returns:
        True when the value is a string-keyed bool map.
    """
    if not is_str_object_dict(value):
        return False
    return all(isinstance(item, bool) for item in value.values())


def _is_feature_flags(value: object) -> bool:
    """Return whether `value` matches the persisted feature-flags shape.

    Valid inputs are dictionaries where required feature-flag keys, when
    present, are mapped to boolean values.

    Returns:
        True when feature flags are structurally valid.
    """
    if not is_str_object_dict(value):
        return False
    return all(
        isinstance(value.get(key, False), bool)
        for key in REQUIRED_FEATURE_FLAGS
    )


def _is_preferences(value: object) -> bool:
    """Return whether `value` matches the persisted preferences shape.

    Accepted keys include `dailyGoalMinutes` (int), `reduceMotion` (bool),
    `reminderEnabled` (bool), `reminderTime` (str), `timezone` (str), and
    `theme` (one of `VALID_THEMES`). Missing keys are validated against local
    defaults used by this module.

    Returns:
        True when preferences are structurally valid.
    """
    if not is_str_object_dict(value):
        return False
    checks = (
        isinstance(value.get("dailyGoalMinutes", 30), int),
        isinstance(value.get("reduceMotion", False), bool),
        isinstance(value.get("reminderEnabled", False), bool),
        isinstance(value.get("reminderTime", "08:00"), str),
        isinstance(value.get("timezone", "UTC"), str),
    )
    if not all(checks):
        return False
    theme = value.get("theme", "dark")
    return isinstance(theme, str) and theme in VALID_THEMES


def _raise_state_type_error(message: str) -> None:
    """Raise the shared state-snapshot type error with one message shape.

    Raises:
        TypeError: Raised with the provided snapshot validation message.
    """
    error_message = message
    raise TypeError(error_message)


def _require_state_field(*, is_valid: bool, message: str) -> None:
    """Raise when one persisted-state field fails its boundary validation."""
    if is_valid:
        return
    _raise_state_type_error(message)


# TODO: Is saved state payload ever not going to be a payload? Should
# this not be a narrower type?
def validate_state_snapshot(state: object) -> dict[str, object]:
    """Validate mobile state payload shape against shared planner contracts.

    Required top-level fields:
    - ``books`` (list)
    - ``settings`` (object)
    - ``sessions`` (list)
    - ``schedule_completions`` (str->bool map)
    - ``blocked_day_books`` (str->bool map)
    - ``feature_flags`` (object)
    - ``preferences`` (object)
    - ``last_result`` (object or null)

    Returns:
        Validated state snapshot as a mutable object dictionary.

    Raises:
        TypeError: If the saved state payload fails shape validation.
    """
    if not is_str_object_dict(state):
        message = "Saved state payload must be an object"
        raise TypeError(message)
    state_map: dict[str, object] = state
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
