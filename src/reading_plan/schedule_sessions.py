from __future__ import annotations

import math
from collections.abc import Iterator
from datetime import date

from .budget import words_per_block, words_per_minute
from .calendar import date_range
from .types import Book, Settings

Session = tuple[date, int, Book, int, int]


def clip_session(book: Book, settings: Settings, blocks: int, remaining_words: int) -> tuple[int, int]:
    if remaining_words <= 0:
        return 0, 0
    max_minutes = blocks * settings.time_quantum_minutes
    max_words = blocks * words_per_block(book, settings)
    words = min(max_words, remaining_words)
    if words <= 0:
        return 0, 0
    minutes = min(max_minutes, math.ceil(words / words_per_minute(book, settings)))
    return minutes, words


def iter_sessions(
    books: list[Book],
    settings: Settings,
    assignments: dict[tuple[str, date], int],
) -> Iterator[Session]:
    book_map = {book.book_id: book for book in books}
    remaining = {book.book_id: book.words_total for book in books}
    for day in date_range(settings.start_date, settings.end_date):
        items = [(bid, blk) for (bid, assigned_day), blk in assignments.items() if assigned_day == day and blk > 0]
        items.sort(key=lambda row: (book_map[row[0]].priority, row[0]))
        idx = 0
        for book_id, blocks in items:
            book = book_map[book_id]
            minutes, words = clip_session(book, settings, blocks, remaining[book_id])
            if words <= 0:
                continue
            remaining[book_id] -= words
            idx += 1
            yield day, idx, book, minutes, words
