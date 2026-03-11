"""Utilities for builders book."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any
from uuid import uuid4

from reading_plan.input.builders_coerce import optional_int, to_float, to_int
from reading_plan.input.builders_shared import WORDS_PER_PAGE
from reading_plan.input.validate import validate_book
from reading_plan.planner_types import WEEKDAYS, Book
from reading_plan.reading_calendar import parse_date

if TYPE_CHECKING:
    from collections.abc import Mapping

    from src.reading_plan.api_types import BookData

MIN_PROGRESS_PERCENT = 0
MAX_PROGRESS_PERCENT = 100


def _estimated_words_read_from_pages(
    pages_read: int, words_full: int, pages_raw: int | None
) -> int:
    """Estimate words read from pages using per-book density when possible.

    :param pages_read: number of pages read, as provided by user
    :param words_full: total words in the book, derived from input fields
    :param pages_raw: total pages in the book, as provided by user (may be None)
    :return: estimated words read based on pages read and book density,
                or a fallback estimate when pages_raw is unavailable or invalid
    """
    pages_total = optional_int(pages_raw, "pages_total")
    if pages_total is None or pages_total <= 0:
        return pages_read * WORDS_PER_PAGE
    bounded_pages = max(0, min(pages_read, pages_total))
    return round(words_full * bounded_pages / pages_total)


def _word_stats(data: BookData) -> tuple[int, int, float]:
    """Derive full words, remaining words, and progress from mixed fields.

    :param data: raw book payload with mixed fields for words/pages and progress
    :return: tuple of (full words, remaining words, progress percent)
    """
    words_raw = data.get("words_total", 0)
    pages_raw = data.get("pages_total", 0)

    if words_raw is not None:
        if not isinstance(words_raw, int):
            msg = "words_total must be an integer"
            raise ValueError(msg)
        full = words_raw or 0
        if full <= 0:
            msg = "words_total must be greater than 0"
            raise ValueError(msg)
    else:
        full = to_int(pages_raw or 0, "pages_total") * WORDS_PER_PAGE

    progress, words_read = _calculate_words_read(data, full, pages_raw)

    return full, max(0, full - words_read), progress


def _calculate_words_read(
    data: BookData, full_words: int, pages_raw: int | None
) -> tuple[float, int]:

    words_read = optional_int(data.get("words_read"), "words_read")
    pages_read = optional_int(data.get("pages_read"), "pages_read")
    if words_read is None and pages_read is not None:
        words_read = _estimated_words_read_from_pages(
            pages_read, full_words, pages_raw
        )
    if words_read is None:
        progress = to_float(
            data.get("progress_percent", 0.0), "progress_percent"
        )
        if progress < MIN_PROGRESS_PERCENT or progress > MAX_PROGRESS_PERCENT:
            msg = "progress_percent must be between 0 and 100"
            raise ValueError(msg)
        words_read = round(full_words * progress / float(MAX_PROGRESS_PERCENT))
    else:
        words_read = max(0, words_read)
        words_read = min(words_read, full_words)
        progress = (
            0.0
            if full_words <= 0
            else round(
                float(MAX_PROGRESS_PERCENT) * words_read / full_words,
                2,
            )
        )
    return progress, words_read


# TODO: Change this. Users never give a list of days, we can validate these
# in a more normal way.


def _scheduled_day_entries(raw: object) -> list[str]:
    """Parse raw scheduled-day payload into unvalidated weekday entries.

    :param raw: user-provided scheduled_days value, which may be None, a string,
                    or a list of strings
    :return: list of weekday entries (e.g. ["Mon", "Wed"]) without validation
    """
    if raw is None:
        return list(WEEKDAYS)
    if isinstance(raw, str):
        if text := raw.strip():
            return [segment.strip() for segment in text.split(",")]
        return list(WEEKDAYS)
    if isinstance(raw, (list, tuple, set, frozenset)):
        return [str(entry).strip() for entry in raw]
    msg = "scheduled_days must be a list or comma-separated string"
    raise ValueError(msg)


# TODO: Again, this is probably stupid and useless.


def _scheduled_days(data: Mapping[str, Any], book_id: str) -> frozenset[str]:
    """Normalize and validate scheduled weekdays for one book payload.

    :param data: raw book payload with mixed fields for scheduled days
    :param book_id: book_id for error messages when validation fails
    :return: frozenset of validated weekday entries
                (e.g. frozenset({"Mon", "Wed"}))
    """
    selected: set[str] = set()
    for entry in _scheduled_day_entries(data.get("scheduled_days")):
        if not entry:
            continue
        if entry not in WEEKDAYS:
            msg = f"scheduled_days must only include Mon..Sun for {book_id}"
            raise ValueError(msg)
        selected.add(entry)
    if not selected:
        msg = f"scheduled_days must include at least one day for {book_id}"
        raise ValueError(msg)
    return frozenset(selected)


def book_from_data(data: BookData) -> Book:
    """Normalize a raw book payload into a validated planner Book model.

    :param data: raw book payload with mixed fields and formats
    :return: validated Book model with normalized fields
    """
    words_full, remaining_words, progress = _word_stats(data)
    book_id = str(data.get("book_id") or "").strip() or str(uuid4())
    deadline = (
        parse_date(data.get("deadline") or "") if data.get("deadline") else None
    )
    blocked_by = (
        str(data.get("blocked_by") or data.get("blocker_book_id") or "").strip()
        or None
    )
    # Make sure title is not None.
    title = data.get("title", None)
    if title is None:
        msg = "Title is required"
        raise ValueError(msg)
    book = Book(
        book_id=book_id,
        title=title,
        remaining_words=remaining_words,
        priority=to_int(data.get("priority") or 3, "priority"),
        difficulty=to_int(data.get("difficulty") or 1, "difficulty"),
        deadline=deadline,
        min_blocks_per_session=to_int(
            data.get("min_blocks_per_session", 2), "min_blocks_per_session"
        ),
        words_full=words_full,
        progress_percent=progress,
        max_minutes_per_day=optional_int(
            data.get("max_minutes_per_day"), "max_minutes_per_day"
        ),
        blocked_by=blocked_by,
        scheduled_days=_scheduled_days(data, book_id),
    )
    validate_book(book)
    return book
