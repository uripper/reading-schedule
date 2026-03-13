"""Normalize raw book payloads into validated planner Book models."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, TypeGuard
from uuid import uuid4

from reading_plan.input.builders_coerce import (
    optional_int,
    to_float,
    to_int,
)
from reading_plan.input.builders_shared import WORDS_PER_PAGE
from reading_plan.input.validate import check_condition, validate_book
from reading_plan.planner_types import WEEKDAYS, Book
from reading_plan.reading_calendar import parse_date


if TYPE_CHECKING:
    from datetime import date

    from reading_plan.api_types import BookData
    from reading_plan.input.builders_coerce import FloatInput, IntInput

MIN_PROGRESS_PERCENT = 0
MAX_PROGRESS_PERCENT = 100
DEFAULT_PRIORITY = 3
DEFAULT_DIFFICULTY = 1
DEFAULT_MIN_BLOCKS_PER_SESSION = 2
ALL_WEEKDAYS = frozenset(WEEKDAYS)


@dataclass(frozen=True)
class WordStats:
    """A dataclass for containing and freezing parameters."""

    words_full: int
    remaining_words: int
    progress_percent: float


def _is_int_input(value: object) -> TypeGuard[IntInput]:
    return (
        isinstance(value, (int, str, bytes, bytearray))
        or hasattr(value, "__int__")
        or hasattr(value, "__index__")
    )


def _is_float_input(value: object) -> TypeGuard[FloatInput]:
    return (
        isinstance(value, (int, float, str, bytes, bytearray))
        or hasattr(value, "__float__")
        or hasattr(value, "__index__")
    )


def book_from_data(data: BookData) -> Book:
    """Normalize one raw book payload into a validated Book model."""
    book_id = _book_id(data)
    title = _title(data)
    word_stats = _word_stats(data)

    book = Book(
        book_id=book_id,
        title=title,
        remaining_words=word_stats.remaining_words,
        priority=_priority(data),
        difficulty=_difficulty(data),
        deadline=_deadline(data),
        min_blocks_per_session=_min_blocks_per_session(data),
        words_full=word_stats.words_full,
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
    if text:
        return text
    return str(uuid4())


def _title(data: BookData) -> str:
    """Return a non-empty normalized title."""
    raw = data.get("title")
    text = raw.strip() if isinstance(raw, str) else ""
    check_condition("Title is required", condition=bool(text))
    return text


def _priority(data: BookData) -> int:
    """Parse priority with default fallback."""
    raw = data.get("priority", DEFAULT_PRIORITY)
    return _require_int(raw, "priority")


def _difficulty(data: BookData) -> int:
    """Parse difficulty with default fallback."""
    raw = data.get("difficulty", DEFAULT_DIFFICULTY)
    return _require_int(raw, "difficulty")


def _min_blocks_per_session(data: BookData) -> int:
    """Parse min_blocks_per_session with default fallback."""
    raw = data.get(
        "min_blocks_per_session",
        DEFAULT_MIN_BLOCKS_PER_SESSION,
    )
    return _require_int(raw, "min_blocks_per_session")


def _deadline(data: BookData) -> date | None:
    """Parse optional deadline."""
    raw = data.get("deadline")
    if raw is None:
        return None
    if isinstance(raw, str):
        text = raw.strip()
        if not text:
            return None
        return parse_date(text)
    msg = "deadline must be a string or null"
    raise TypeError(msg)


def _blocked_by(data: BookData) -> str | None:
    """Parse optional blocker id, including the legacy alias."""
    raw = data.get("blocked_by") or data.get("blocker_book_id")
    if raw is None:
        return None
    text = str(raw).strip()
    return text or None


def _max_minutes_per_day(data: BookData) -> int | None:
    """Parse optional max_minutes_per_day."""
    raw = data.get("max_minutes_per_day")
    return _parse_optional_int(raw, "max_minutes_per_day")


def _word_stats(data: BookData) -> WordStats:
    """Derive normalized word totals and progress values."""
    words_full = _words_full(data)
    pages_total = _parse_optional_int(data.get("pages_total"), "pages_total")
    words_read = _words_read(data, words_full, pages_total)
    progress_percent = _progress_percent(data, words_full, words_read)
    remaining_words = max(0, words_full - words_read)
    return WordStats(
        words_full=words_full,
        remaining_words=remaining_words,
        progress_percent=progress_percent,
    )


def _words_full(data: BookData) -> int:
    """Resolve total words from direct word count or page estimate."""
    words_full = _parse_optional_int(data.get("words_full"), "words_full")
    if words_full is None:
        pages_total_raw = data.get("pages_total")
        pages_total = _require_int(pages_total_raw, "pages_total")
        check_condition(
            "pages_total must be greater than 0", condition=pages_total > 0
        )
        return pages_total * WORDS_PER_PAGE
    check_condition(
        "words_full must be greater than 0", condition=words_full > 0
    )
    return words_full


def _words_read(
    data: BookData,
    words_full: int,
    pages_total: int | None,
) -> int:
    """Resolve words_read from direct words, pages_read, or progress."""
    words_read = _parse_optional_int(data.get("words_read"), "words_read")
    if words_read is not None:
        return min(max(0, words_read), words_full)

    pages_read = _parse_optional_int(data.get("pages_read"), "pages_read")
    if pages_read is not None:
        estimated = _estimated_words_read_from_pages(
            pages_read,
            words_full,
            pages_total,
        )
        return min(max(0, estimated), words_full)

    progress_percent = _raw_progress_percent(data)
    derived_words_read = round(
        words_full * progress_percent / MAX_PROGRESS_PERCENT
    )
    return min(max(0, derived_words_read), words_full)


def _raw_progress_percent(data: BookData) -> float:
    """Parse the raw progress percent field."""
    raw = data.get("progress_percent", 0.0)
    progress_percent = _require_float(raw, "progress_percent")
    check_condition(
        "progress_percent must be between 0 and 100",
        condition=MIN_PROGRESS_PERCENT
        <= progress_percent
        <= MAX_PROGRESS_PERCENT,
    )
    return progress_percent


def _progress_percent(
    data: BookData,
    words_full: int,
    words_read: int,
) -> float:
    """Return normalized progress percent."""
    if data.get("words_read") is None and data.get("pages_read") is None:
        return _raw_progress_percent(data)
    if words_full <= 0:
        return 0.0
    return round(
        MAX_PROGRESS_PERCENT * words_read / words_full,
        2,
    )


def _estimated_words_read_from_pages(
    pages_read: int,
    words_full: int,
    pages_total: int | None,
) -> int:
    """Estimate words read from page progress."""
    if pages_total is None or pages_total <= 0:
        return pages_read * WORDS_PER_PAGE
    bounded_pages = max(0, min(pages_read, pages_total))
    return round(words_full * bounded_pages / pages_total)


def _scheduled_days(
    raw: list[str] | str | None,
    *,
    book_id: str,
) -> frozenset[str]:
    """Normalize and validate scheduled weekday entries."""
    if raw is None:
        return ALL_WEEKDAYS

    if isinstance(raw, str):
        entries = [segment.strip() for segment in raw.split(",")]
    else:
        entries = [str(entry).strip() for entry in raw]

    selected = {entry for entry in entries if entry}
    if not selected:
        msg = f"scheduled_days must include at least one day for {book_id}"
        raise ValueError(msg)
    invalid_days = selected - ALL_WEEKDAYS
    if invalid_days:
        msg = f"scheduled_days must only include Mon..Sun for {book_id}"
        raise ValueError(msg)
    return frozenset(selected)


def _int_input(raw: object, field: str) -> IntInput:
    """Validate and narrow a raw value into an accepted integer input."""
    if _is_int_input(raw):
        return raw
    msg = f"{field} must be an integer-compatible value"
    raise TypeError(msg)


def _optional_int_input(raw: object | None, field: str) -> IntInput | None:
    """Validate and narrow an optional raw value into integer input."""
    if raw is None:
        return None
    return _int_input(raw, field)


def _float_input(raw: object, field: str) -> FloatInput:
    """Validate and narrow a raw value into an accepted numeric input."""
    if _is_float_input(raw):
        return raw
    msg = f"{field} must be a numeric value"
    raise TypeError(msg)


def _require_int(raw: object, field: str) -> int:
    """Parse a required integer field."""
    return to_int(_int_input(raw, field), field)


def _parse_optional_int(raw: object | None, field: str) -> int | None:
    """Parse an optional integer field."""
    return optional_int(_optional_int_input(raw, field), field)


def _require_float(raw: object, field: str) -> float:
    """Parse a required numeric field."""
    return to_float(_float_input(raw, field), field)
