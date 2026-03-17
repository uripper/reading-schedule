"""Coerce raw input values into typed numbers with field-specific errors."""

from typing import SupportsFloat, SupportsIndex, SupportsInt


IntInput = str | bytes | bytearray | SupportsInt | SupportsIndex
FloatInput = str | bytes | bytearray | SupportsFloat | SupportsIndex


def to_int(raw: IntInput, field: str) -> int:
    """Convert a raw value to an integer.

    Args:
        raw: Raw value to parse.
        field: Field name used in validation errors.

    Returns:
        Parsed integer value.

    Raises:
        ValueError: If ``raw`` cannot be converted to an integer.
    """
    try:
        return int(raw)
    except Exception as exc:
        msg = f"invalid integer for {field}: {raw}"
        raise ValueError(msg) from exc


def to_float(raw: FloatInput, field: str) -> float:
    """Convert a raw value to a float.

    Args:
        raw: Raw value to parse.
        field: Field name used in validation errors.

    Returns:
        Parsed float value.

    Raises:
        ValueError: If ``raw`` cannot be converted to a float.
    """
    try:
        return float(raw)
    except Exception as exc:
        msg = f"invalid number for {field}: {raw}"
        raise ValueError(msg) from exc


def optional_int(raw: IntInput | None, field: str) -> int | None:
    """Parse an optional integer field.

    Args:
        raw: Raw value to parse when present.
        field: Field name used in validation errors.

    Returns:
        Parsed integer value, or ``None`` when ``raw`` is ``None``.
    """
    return to_int(raw, field) if raw is not None else None
