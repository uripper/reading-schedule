"""Coerce raw input values into typed numbers with field-specific errors."""

from typing import SupportsFloat, SupportsIndex, SupportsInt

IntInput = str | bytes | bytearray | SupportsInt | SupportsIndex
FloatInput = str | bytes | bytearray | SupportsFloat | SupportsIndex

# TODO: probably just get rid of this stupid bullshit


def to_int(raw: IntInput, field: str) -> int:
    """Convert to int."""
    try:
        return int(raw)
    except Exception as exc:
        msg = f"invalid integer for {field}: {raw}"
        raise ValueError(msg) from exc


def to_float(raw: FloatInput, field: str) -> float:
    """Convert to float."""
    try:
        return float(raw)
    except Exception as exc:
        msg = f"invalid number for {field}: {raw}"
        raise ValueError(msg) from exc


def optional_int(raw: IntInput | None, field: str) -> int | None:
    """Parse an optional integer field, returning None for blank values."""
    return to_int(raw, field) if raw is not None else None
