"""Utilities for builders book."""

from __future__ import annotations

from typing import Any
from uuid import uuid4

from ..calendar import parse_date
from ..types import Book
from .builders_coerce import optional_int, to_float, to_int
from .builders_shared import WORDS_PER_PAGE
from .validate import validate_book


def _estimated_words_read_from_pages(
    pages_read: int, words_full: int, pages_raw: int | None
) -> int:
    """Estimate words read from pages, preferring per-book density when possible."""
    pages_total = optional_int(pages_raw, "pages_total")
    if pages_total is None or pages_total <= 0:
        return pages_read * WORDS_PER_PAGE
    bounded_pages = max(0, min(pages_read, pages_total))
    return int(round(words_full * bounded_pages / pages_total))


def _word_stats(data: dict[str, Any]) -> tuple[int, int, float]:
    """Derive full words, remaining words, and progress from mixed input fields."""
    words_raw = data.get("words_total")
    pages_raw = data.get("pages_total")
    has_words = str(words_raw or "").strip() != ""
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
        if progress < 0 or progress > 100:
            raise ValueError("progress_percent must be between 0 and 100")
        words_read = int(round(full * progress / 100.0))
    else:
        words_read = max(0, words_read)
        words_read = min(words_read, full)
        progress = 0.0 if full <= 0 else round(100.0 * words_read / full, 2)
    return full, max(0, full - words_read), progress


def book_from_data(data: dict[str, Any]) -> Book:
    """Normalize a raw book payload into a validated planner Book model."""
    words_full, words_remaining, progress = _word_stats(data)
    deadline = parse_date(data["deadline"]) if data.get("deadline") else None
    blocked_by = (
        str(data.get("blocked_by") or data.get("blocker_book_id") or "").strip()
        or None
    )
    book = Book(
        book_id=str(data.get("book_id") or "").strip() or str(uuid4()),
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
    )
    validate_book(book)
    return book
