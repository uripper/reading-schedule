from __future__ import annotations

import math
from datetime import date

from .calendar import date_range, weekday_key
from .types import Book, Settings


def minutes_for_day(settings: Settings, day: date) -> int:
    if day in settings.days_off:
        return 0
    if settings.minutes_by_weekday:
        return settings.minutes_by_weekday.get(weekday_key(day), 0)
    return settings.minutes_per_day or 0


def calendar_minutes(settings: Settings) -> dict[date, int]:
    return {d: minutes_for_day(settings, d) for d in date_range(settings.start_date, settings.end_date)}


def day_capacity_blocks(settings: Settings, day: date) -> int:
    minutes = minutes_for_day(settings, day)
    return minutes // settings.time_quantum_minutes


def words_per_minute(book: Book, settings: Settings) -> float:
    multiplier = settings.difficulty_multiplier[book.difficulty]
    return settings.wpm_base * multiplier


def words_per_block(book: Book, settings: Settings) -> int:
    return int(round(words_per_minute(book, settings) * settings.time_quantum_minutes))


def required_minutes(book: Book, settings: Settings) -> int:
    return int(math.ceil(book.words_total / words_per_minute(book, settings)))


def required_total_minutes(books: list[Book], settings: Settings) -> int:
    return sum(required_minutes(book, settings) for book in books)
