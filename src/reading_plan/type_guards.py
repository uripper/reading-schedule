"""Shared TypeGuard helpers for planner payload validation.

These guards provide shallow runtime narrowing at IO boundaries. They are not
full schema validators and should be paired with parser-level validation.
"""

from typing import TYPE_CHECKING, TypeGuard

from reading_plan.planner_types import (
    PLAN_MODE_FINISH_SOON,
    PLAN_MODE_SPREAD_OUT,
)


if TYPE_CHECKING:
    from reading_plan.api_types import BookData, SettingsData
    from reading_plan.planner_types import PlanModes

# TODO: This is so fucking stupid. Why are we doing this instead of just using
# proper narrow types when we know EXACTLY what is going to be sent and
# received? There is no mystery as to what information we will receive due
# to validation on the front and back ends of the applications. We do not need
# to prepare for arbitrary JSONs sent by rogue CLI exposure, so why the fuck
# are we type narrowing instead of fucking using the right types that we know
# we will use? This is so fucking dumb.


def is_object_mapping(value: object) -> TypeGuard[dict[object, object]]:
    """Return whether a runtime value is a dictionary.

    Returns:
        True when ``value`` is a dictionary.
    """
    return isinstance(value, dict)


def is_str_object_dict(value: object) -> TypeGuard[dict[str, object]]:
    """Return whether a runtime value is a dictionary with string keys.

    Returns:
        True when ``value`` is a dictionary with only string keys.
    """
    return isinstance(value, dict) and all(
        isinstance(key, str) for key in value
    )


def is_object_list(value: object) -> TypeGuard[list[object]]:
    """Return whether a runtime value is a list.

    Returns:
        True when ``value`` is a list.
    """
    return isinstance(value, list)


def is_book_data_row(value: object) -> TypeGuard[BookData]:
    """Return whether a runtime value matches the loose book row boundary.

    This intentionally checks only object-ness and string keys.

    Returns:
        True when ``value`` matches the shallow book row boundary.
    """
    return is_str_object_dict(value)


def is_book_data_list(value: object) -> TypeGuard[list[BookData]]:
    """Return whether a runtime value is a list of loose book rows.

    Returns:
        True when ``value`` is a shallowly validated list of book rows.
    """
    return is_object_list(value) and all(
        is_book_data_row(item) for item in value
    )


def is_settings_data(value: object) -> TypeGuard[SettingsData]:
    """Return whether a runtime value matches the loose settings boundary.

    This intentionally checks only object-ness and string keys.

    Returns:
        True when ``value`` matches the shallow settings boundary.
    """
    return is_str_object_dict(value)


def is_plan_mode(value: str) -> TypeGuard[PlanModes]:
    """Return whether a runtime value is a valid plan mode string."""
    return value in {PLAN_MODE_FINISH_SOON, PLAN_MODE_SPREAD_OUT}
