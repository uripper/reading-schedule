from __future__ import annotations

from uuid import uuid4
from typing import Any

from .calendar import parse_date
from .types import Book, DEFAULT_DIFFICULTY_MULTIPLIER, Settings
from .validate import validate_book, validate_settings

WORDS_PER_PAGE = 300


def _to_int(raw: Any, field: str) -> int:
    try:
        return int(raw)
    except Exception as exc:
        raise ValueError(f"invalid integer for {field}: {raw}") from exc


def _to_float(raw: Any, field: str) -> float:
    try:
        return float(raw)
    except Exception as exc:
        raise ValueError(f"invalid number for {field}: {raw}") from exc


def book_from_data(data: dict[str, Any]) -> Book:
    words_raw = data.get("words_total")
    pages_raw = data.get("pages_total")
    has_words = str(words_raw or "").strip() != ""
    words = _to_int(words_raw, "words_total") if has_words else _to_int(pages_raw or 0, "pages_total") * WORDS_PER_PAGE
    deadline = parse_date(data["deadline"]) if data.get("deadline") else None
    book_id = str(data.get("book_id") or "").strip() or str(uuid4())
    book = Book(
        book_id=book_id,
        title=str(data["title"]).strip(),
        words_total=words,
        priority=_to_int(data["priority"], "priority"),
        difficulty=_to_int(data["difficulty"], "difficulty"),
        deadline=deadline,
        min_blocks_per_session=_to_int(data.get("min_blocks_per_session", 2), "min_blocks_per_session"),
    )
    validate_book(book)
    return book


def settings_from_data(data: dict[str, Any]) -> Settings:
    by_weekday = {k[:3].title(): int(v) for k, v in (data.get("minutes_by_weekday") or {}).items()}
    raw_diff = data.get("difficulty_multiplier", DEFAULT_DIFFICULTY_MULTIPLIER)
    diff = {int(k): float(v) for k, v in raw_diff.items()}
    minutes_per_day = data.get("minutes_per_day")
    settings = Settings(
        start_date=parse_date(data["start_date"]),
        end_date=parse_date(data["end_date"]),
        minutes_per_day=None if minutes_per_day in (None, "") else _to_int(minutes_per_day, "minutes_per_day"),
        minutes_by_weekday=by_weekday,
        days_off={parse_date(d) for d in data.get("days_off", [])},
        wpm_base=_to_int(data["wpm_base"], "wpm_base"),
        time_quantum_minutes=_to_int(data.get("time_quantum_minutes", 15), "time_quantum_minutes"),
        max_sessions_per_day=_to_int(data.get("max_sessions_per_day", 2), "max_sessions_per_day"),
        max_books_per_day=_to_int(data.get("max_books_per_day", 2), "max_books_per_day"),
        w_finish=_to_float(data.get("w_finish", 5.0), "w_finish"),
        w_priority=_to_float(data.get("w_priority", 1.0), "w_priority"),
        w_switch=_to_float(data.get("w_switch", 0.0), "w_switch"),
        w_smooth=_to_float(data.get("w_smooth", 0.0), "w_smooth"),
        difficulty_multiplier=diff,
        max_blocks_per_book_per_day=_to_int(data.get("max_blocks_per_book_per_day", 12), "max_blocks_per_book_per_day"),
    )
    validate_settings(settings)
    return settings
