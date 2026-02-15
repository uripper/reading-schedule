from __future__ import annotations

import csv
import json
from pathlib import Path

from .calendar import parse_date
from .types import Book, DEFAULT_DIFFICULTY_MULTIPLIER, Settings, WEEKDAYS

WORDS_PER_PAGE = 300


def _as_int(raw: str, field: str) -> int:
    try:
        return int(raw)
    except Exception as exc:
        raise ValueError(f"invalid integer for {field}: {raw}") from exc


def load_books(path: str) -> list[Book]:
    books: list[Book] = []
    with Path(path).open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            words_raw = row.get("words_total")
            pages_raw = row.get("pages_total")
            words = (
                _as_int(words_raw, "words_total")
                if words_raw
                else _as_int(pages_raw or "0", "pages_total") * WORDS_PER_PAGE
            )
            deadline = parse_date(row["deadline"]) if row.get("deadline") else None
            min_blocks = _as_int(
                row.get("min_blocks_per_session", "2"), "min_blocks_per_session"
            )
            book = Book(
                book_id=row["book_id"].strip(),
                title=row["title"].strip(),
                words_total=words,
                priority=_as_int(row["priority"], "priority"),
                difficulty=_as_int(row["difficulty"], "difficulty"),
                deadline=deadline,
                min_blocks_per_session=min_blocks,
            )
            _validate_book(book)
            books.append(book)
    if not books:
        raise ValueError("books file is empty")
    return books


def load_settings(path: str) -> Settings:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    by_weekday = {
        k[:3].title(): int(v) for k, v in data.get("minutes_by_weekday", {}).items()
    }
    diff = {
        int(k): float(v)
        for k, v in data.get(
            "difficulty_multiplier", DEFAULT_DIFFICULTY_MULTIPLIER
        ).items()
    }
    settings = Settings(
        start_date=parse_date(data["start_date"]),
        end_date=parse_date(data["end_date"]),
        minutes_per_day=data.get("minutes_per_day"),
        minutes_by_weekday=by_weekday,
        days_off={parse_date(d) for d in data.get("days_off", [])},
        wpm_base=int(data["wpm_base"]),
        time_quantum_minutes=int(data.get("time_quantum_minutes", 15)),
        max_sessions_per_day=int(data.get("max_sessions_per_day", 2)),
        max_books_per_day=int(data.get("max_books_per_day", 2)),
        w_finish=float(data.get("w_finish", 5.0)),
        w_priority=float(data.get("w_priority", 1.0)),
        w_switch=float(data.get("w_switch", 0.0)),
        w_smooth=float(data.get("w_smooth", 0.0)),
        difficulty_multiplier=diff,
        max_blocks_per_book_per_day=int(data.get("max_blocks_per_book_per_day", 12)),
    )
    _validate_settings(settings)
    return settings


def load_inputs(books_path: str, settings_path: str) -> tuple[list[Book], Settings]:
    return load_books(books_path), load_settings(settings_path)


def _validate_book(book: Book) -> None:
    if not book.book_id or not book.title:
        raise ValueError("book_id and title are required")
    if (
        book.words_total <= 0
        or book.priority not in range(1, 6)
        or book.difficulty not in range(1, 6)
    ):
        raise ValueError(f"invalid values for book {book.book_id}")
    if book.min_blocks_per_session <= 0:
        raise ValueError(f"min_blocks_per_session must be > 0 for {book.book_id}")


def _validate_settings(settings: Settings) -> None:
    if settings.end_date < settings.start_date:
        raise ValueError("end_date must be on or after start_date")
    if not settings.minutes_by_weekday and not settings.minutes_per_day:
        raise ValueError("set minutes_per_day or minutes_by_weekday")
    if (
        settings.time_quantum_minutes <= 0
        or settings.max_sessions_per_day <= 0
        or settings.max_books_per_day <= 0
    ):
        raise ValueError(
            "time_quantum_minutes/max_sessions_per_day/max_books_per_day must be > 0"
        )
    if sorted(settings.minutes_by_weekday.keys()) not in ([], sorted(WEEKDAYS)):
        raise ValueError("minutes_by_weekday must include Mon..Sun when provided")
    if sorted(settings.difficulty_multiplier.keys()) != [1, 2, 3, 4, 5]:
        raise ValueError("difficulty_multiplier must contain keys 1..5")
