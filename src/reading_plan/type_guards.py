"""Shared TypeGuard helpers for planner payload validation."""

from typing import TYPE_CHECKING, TypeGuard


if TYPE_CHECKING:
    from reading_plan.api_types import BookData, SettingsData


def is_object_mapping(value: object) -> TypeGuard[dict[object, object]]:
    """Return whether a runtime value is a dictionary."""
    return isinstance(value, dict)


def is_str_object_dict(value: object) -> TypeGuard[dict[str, object]]:
    """Return whether a runtime value is a dictionary with string keys."""
    return isinstance(value, dict) and all(
        isinstance(key, str) for key in value
    )


def is_object_list(value: object) -> TypeGuard[list[object]]:
    """Return whether a runtime value is a list."""
    return isinstance(value, list)


def is_book_data_row(value: object) -> TypeGuard[BookData]:
    """Return whether a runtime value matches the loose book row boundary."""
    return is_str_object_dict(value)


def is_book_data_list(value: object) -> TypeGuard[list[BookData]]:
    """Return whether a runtime value is a list of loose book rows."""
    return is_object_list(value) and all(
        is_book_data_row(item) for item in value
    )


def is_settings_data(value: object) -> TypeGuard[SettingsData]:
    """Return whether a runtime value matches the loose settings boundary."""
    return is_str_object_dict(value)
