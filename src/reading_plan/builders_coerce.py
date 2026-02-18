from __future__ import annotations

from typing import Any


def to_int(raw: Any, field: str) -> int:
    try:
        return int(raw)
    except Exception as exc:
        raise ValueError(f"invalid integer for {field}: {raw}") from exc


def to_float(raw: Any, field: str) -> float:
    try:
        return float(raw)
    except Exception as exc:
        raise ValueError(f"invalid number for {field}: {raw}") from exc


def optional_int(raw: Any, field: str) -> int | None:
    return None if raw in (None, "") else to_int(raw, field)
