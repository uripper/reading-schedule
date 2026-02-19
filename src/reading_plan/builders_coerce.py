"""Utilities for builders coerce."""

from __future__ import annotations

from typing import Any


def to_int(raw: Any, field: str) -> int:
    """Convert to int."""
    try:
        return int(raw)
    except Exception as exc:
        raise ValueError(f"invalid integer for {field}: {raw}") from exc


def to_float(raw: Any, field: str) -> float:
    """Convert to float."""
    try:
        return float(raw)
    except Exception as exc:
        raise ValueError(f"invalid number for {field}: {raw}") from exc


def optional_int(raw: Any, field: str) -> int | None:
    """Execute optional int."""
    if raw in (None, ""):
        return None
    return to_int(raw, field)
