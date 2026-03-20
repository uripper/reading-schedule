"""Normalize raw book payloads into validated planner Book models."""

from __future__ import annotations

from typing import TYPE_CHECKING, TypeGuard
from uuid import uuid4

from reading_plan.input.builders_book_words import word_stats_from_data
from reading_plan.input.builders_coerce import optional_int, to_int
from reading_plan.input.validate import check_condition, validate_book
from reading_plan.planner_types import WEEKDAYS, Book
from reading_plan.reading_calendar import parse_date


if TYPE_CHECKING:
    from datetime import date

    from reading_plan.api_types import BookData
    from reading_plan.input.builders_coerce import IntInput

DEFAULT_PRIORITY = 3
DEFAULT_DIFFICULTY = 1
DEFAULT_MIN_BLOCKS_PER_SESSION = 2
ALL_WEEKDAYS = frozenset(WEEKDAYS)


def book_from_data(data: BookData) -> Book:
    """Normalize one raw book payload into a validated Book model.

    Returns:
        Computed value.
    """
    book_id = _book_id(data)
    title = _title(data)
    word_stats = word_stats_from_data(data)

    book = Book(
        book_id=book_id,
        title=title,
        remaining_words=word_stats.remaining_words,
        priority=_priority(data),
        difficulty=_difficulty(data),
        deadline=_deadline(data),
        min_blocks_per_session=_min_blocks_per_session(data),
        words_total=word_stats.words_total,
        progress_percent=word_stats.progress_percent,
        max_minutes_per_day=_max_minutes_per_day(data),
        blocked_by=_blocked_by(data),
        scheduled_days=_scheduled_days(
            data.get("scheduled_days"),
            book_id=book_id,
        ),
    )
    validate_book(book)
    return book


def _book_id(data: BookData) -> str:
    """Return normalized book_id, generating one when missing."""
    raw = data.get("book_id")
    if raw is None:
        return str(uuid4())
    text = str(raw).strip()
    return text or str(uuid4())


def _title(data: BookData) -> str:
    """Return a non-empty normalized title."""
    raw = data.get("title")
    text = raw.strip() if isinstance(raw, str) else ""
    check_condition("Title is required", condition=bool(text))
    return text


def _priority(data: BookData) -> int:
    """Parse priority with default fallback.

    Returns:
        Computed value.
    """
    raw = data.get("priority", DEFAULT_PRIORITY)
    return _require_int(raw, "priority")


def _difficulty(data: BookData) -> int:
    """Parse difficulty with default fallback.

    Returns:
        Computed value.
    """
    raw = data.get("difficulty", DEFAULT_DIFFICULTY)
    return _require_int(raw, "difficulty")


def _min_blocks_per_session(data: BookData) -> int:
    """Parse min_blocks_per_session with default fallback.

    Returns:
        Computed value.
    """
    raw = data.get(
        "min_blocks_per_session",
        DEFAULT_MIN_BLOCKS_PER_SESSION,
    )
    return _require_int(raw, "min_blocks_per_session")


def _deadline(data: BookData) -> date | None:
    """Parse optional deadline.

    Returns:
        Computed value.

    Raises:
        TypeError: Raised when input validation fails.
    """
    raw = data.get("deadline")
    if raw is None:
        return None
    if isinstance(raw, str):
        text = raw.strip()
        return parse_date(text) if text else None
    msg = "deadline must be a string or null"
    raise TypeError(msg)


def _blocked_by(data: BookData) -> str | None:
    """Parse optional blocker id, including the legacy alias.

    Returns:
        Computed value.
    """
    raw = data.get("blocked_by") or data.get("blocker_book_id")
    if raw is None:
        return None
    text = str(raw).strip()
    return text or None


def _max_minutes_per_day(data: BookData) -> int | None:
    """Parse optional max_minutes_per_day.

    Returns:
        Computed value.
    """
    return _parse_optional_int(
        data.get("max_minutes_per_day"),
        "max_minutes_per_day",
    )


def _scheduled_day_entries(raw: list[str] | str) -> list[str]:
    """Return trimmed weekday entries from string or list input."""
    if isinstance(raw, str):
        return [segment.strip() for segment in raw.split(",")]
    return [str(entry).strip() for entry in raw]


def _validated_scheduled_days(
    book_id: str,
    selected: set[str],
) -> frozenset[str]:
    """Validate normalized weekday names for one book.

    Returns:
        Computed value.

    Raises:
        ValueError: Raised when input validation fails.
    """
    if not selected:
        msg = f"scheduled_days must include at least one day for {book_id}"
        raise ValueError(msg)
    if _invalid_days := selected - ALL_WEEKDAYS:
        msg = f"scheduled_days must only include Mon..Sun for {book_id}"
        raise ValueError(msg)
    return frozenset(selected)


def _scheduled_days(
    raw: list[str] | str | None,
    *,
    book_id: str,
) -> frozenset[str]:
    """Normalize and validate scheduled weekday entries.

    Returns:
        Computed value.
    """
    if raw is None:
        return ALL_WEEKDAYS
    entries = _scheduled_day_entries(raw)
    selected = {entry for entry in entries if entry}
    return _validated_scheduled_days(book_id, selected)


def _require_int(raw: object, field: str) -> int:
    """Parse a required integer field.

    Returns:
        Computed value.

    Raises:
        TypeError: Raised when input validation fails.
    """
    if _is_int_input(raw):
        return to_int(raw, field)
    msg = f"{field} must be an integer-compatible value"
    raise TypeError(msg)


def _parse_optional_int(raw: object | None, field: str) -> int | None:
    """Parse an optional integer field.

    Returns:
        Computed value.

    Raises:
        TypeError: Raised when input validation fails.
    """
    if raw is None:
        return None
    if _is_int_input(raw):
        return optional_int(raw, field)
    msg = f"{field} must be an integer-compatible value"
    raise TypeError(msg)


def _is_int_input(raw: object) -> TypeGuard[IntInput]:
    """Return whether a value can be parsed as an integer input."""
    return (
        isinstance(raw, (int, str, bytes, bytearray))
        or hasattr(raw, "__int__")
        or hasattr(raw, "__index__")
    )
