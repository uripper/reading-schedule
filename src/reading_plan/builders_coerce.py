"""Utilities for builders coerce."""

from __future__ import annotations

from typing import SupportsFloat, SupportsIndex, SupportsInt

IntInput = str | bytes | bytearray | SupportsInt | SupportsIndex
FloatInput = str | bytes | bytearray | SupportsFloat | SupportsIndex


def to_int(raw: IntInput, field: str) -> int:
    """Convert to int."""
    try:
        return int(raw)
    except Exception as exc:
        raise ValueError(f"invalid integer for {field}: {raw}") from exc


def to_float(raw: FloatInput, field: str) -> float:
    """Convert to float."""
    try:
        return float(raw)
    except Exception as exc:
        raise ValueError(f"invalid number for {field}: {raw}") from exc


def optional_int(raw: IntInput | None, field: str) -> int | None:
    """Execute optional int."""
    return None if raw in (None, "") else to_int(raw, field)
