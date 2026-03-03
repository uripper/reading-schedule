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


def _word_stats(data: Mapping[str, Any]) -> tuple[int, int, float]:
    """Derive full words, remaining words, and progress from mixed fields.

    :param data: raw book payload with mixed fields for words/pages and progress
    :return: tuple of (full words, remaining words, progress percent)
    """
    words_raw = data.get("words_total")
    pages_raw = data.get("pages_total")
    has_words = bool(str(words_raw or "").strip())
    if has_words:
        full = to_int(words_raw or 0, "words_total")
    else:
        full = to_int(pages_raw or 0, "pages_total") * WORDS_PER_PAGE

    words_read = optional_int(data.get("words_read"), "words_read")
    pages_read = optional_int(data.get("pages_read"), "pages_read")
    if words_read is None and pages_read is not None:
        words_read = _estimated_words_read_from_pages(
            pages_read, full, pages_raw
        )

    if words_read is None:
        progress = to_float(
            data.get("progress_percent", 0.0), "progress_percent"
        )
        if progress < MIN_PROGRESS_PERCENT or progress > MAX_PROGRESS_PERCENT:
            msg = "progress_percent must be between 0 and 100"
            raise ValueError(msg)
        words_read = round(full * progress / float(MAX_PROGRESS_PERCENT))
    else:
        words_read = max(0, words_read)
        words_read = min(words_read, full)
        progress = (
            0.0
            if full <= 0
            else round(
                float(MAX_PROGRESS_PERCENT) * words_read / full,
                2,
            )
        )
    return full, max(0, full - words_read), progress


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


def book_from_data(data: Mapping[str, Any]) -> Book:
    """Normalize a raw book payload into a validated planner Book model.

    :param data: raw book payload with mixed fields and formats
    :return: validated Book model with normalized fields
    """
    words_full, words_remaining, progress = _word_stats(data)
    book_id = str(data.get("book_id") or "").strip() or str(uuid4())
    deadline = parse_date(data["deadline"]) if data.get("deadline") else None
    blocked_by = (
        str(data.get("blocked_by") or data.get("blocker_book_id") or "").strip()
        or None
    )
    book = Book(
        book_id=book_id,
        title=str(data["title"]).strip(),
        words_total=words_remaining,
        priority=to_int(data["priority"], "priority"),
        difficulty=to_int(data["difficulty"], "difficulty"),
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
