from __future__ import annotations

from .types import Book, Settings, WEEKDAYS


def validate_book(book: Book) -> None:
    if not book.book_id or not book.title:
        raise ValueError("book_id and title are required")
    if book.words_total <= 0:
        raise ValueError(f"words_total must be > 0 for {book.book_id}")
    if book.priority not in range(1, 6):
        raise ValueError(f"priority must be 1..5 for {book.book_id}")
    if book.difficulty not in range(1, 11):
        raise ValueError(f"difficulty must be 1..10 for {book.book_id}")
    if book.min_blocks_per_session <= 0:
        raise ValueError(f"min_blocks_per_session must be > 0 for {book.book_id}")


def validate_settings(settings: Settings) -> None:
    if settings.end_date < settings.start_date:
        raise ValueError("end_date must be on or after start_date")
    if not settings.minutes_by_weekday and not settings.minutes_per_day:
        raise ValueError("set minutes_per_day or minutes_by_weekday")
    if settings.time_quantum_minutes <= 0:
        raise ValueError("time_quantum_minutes must be > 0")
    if settings.max_sessions_per_day <= 0 or settings.max_books_per_day <= 0:
        raise ValueError("max_sessions_per_day and max_books_per_day must be > 0")
    if sorted(settings.minutes_by_weekday.keys()) not in ([], sorted(WEEKDAYS)):
        raise ValueError("minutes_by_weekday must include Mon..Sun when provided")
    if sorted(settings.difficulty_multiplier.keys()) != list(range(1, 11)):
        raise ValueError("difficulty_multiplier must contain keys 1..10")
