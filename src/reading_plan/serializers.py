from __future__ import annotations

from .types import Book, Settings


def book_to_data(book: Book) -> dict[str, object]:
    words_total = book.words_total
    if book.words_full is not None:
        words_total = book.words_full
    deadline = None
    if book.deadline:
        deadline = book.deadline.isoformat()
    return {
        "book_id": book.book_id,
        "title": book.title,
        "words_total": words_total,
        "priority": book.priority,
        "difficulty": book.difficulty,
        "deadline": deadline,
        "min_blocks_per_session": book.min_blocks_per_session,
        "progress_percent": book.progress_percent,
        "words_remaining": book.words_total,
        "max_minutes_per_day": book.max_minutes_per_day,
    }


def settings_to_data(settings: Settings) -> dict[str, object]:
    return {
        "start_date": settings.start_date.isoformat(),
        "end_date": settings.end_date.isoformat(),
        "minutes_per_day": settings.minutes_per_day,
        "minutes_by_weekday": settings.minutes_by_weekday,
        "days_off": sorted(d.isoformat() for d in settings.days_off),
        "wpm_base": settings.wpm_base,
        "time_quantum_minutes": settings.time_quantum_minutes,
        "max_sessions_per_day": settings.max_sessions_per_day,
        "max_books_per_day": settings.max_books_per_day,
        "w_finish": settings.w_finish,
        "w_priority": settings.w_priority,
        "w_switch": settings.w_switch,
        "w_smooth": settings.w_smooth,
        "max_blocks_per_book_per_day": settings.max_blocks_per_book_per_day,
        "difficulty_multiplier": {str(k): v for k, v in settings.difficulty_multiplier.items()},
    }
