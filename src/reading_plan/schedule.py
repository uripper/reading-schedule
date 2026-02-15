from __future__ import annotations

import csv
import math
from datetime import date
from pathlib import Path

from .budget import words_per_block, words_per_minute
from .calendar import date_range
from .types import Book, Settings


def to_schedule_rows(
    books: list[Book],
    settings: Settings,
    assignments: dict[tuple[str, date], int],
) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    rows.extend(
        {
            "date": day.isoformat(),
            "session_index": idx,
            "book_id": book.book_id,
            "title": book.title,
            "minutes": minutes,
            "words_planned": words,
        }
        for day, idx, book, minutes, words in _iter_sessions(
            books, settings, assignments
        )
    )
    return rows


def compute_plan_totals(
    books: list[Book],
    settings: Settings,
    assignments: dict[tuple[str, date], int],
) -> tuple[dict[str, int], int]:
    per_book = {b.book_id: 0 for b in books}
    total_minutes = 0
    for _day, _idx, book, minutes, words in _iter_sessions(books, settings, assignments):
        per_book[book.book_id] += words
        total_minutes += minutes
    return per_book, total_minutes


def _iter_sessions(
    books: list[Book],
    settings: Settings,
    assignments: dict[tuple[str, date], int],
):
    book_map = {b.book_id: b for b in books}
    remaining = {b.book_id: b.words_total for b in books}
    for day in date_range(settings.start_date, settings.end_date):
        items = [(bid, blk) for (bid, d), blk in assignments.items() if d == day and blk > 0]
        items.sort(key=lambda x: (book_map[x[0]].priority, x[0]))
        idx = 0
        for book_id, blocks in items:
            book = book_map[book_id]
            minutes, words = _clip_session(book, settings, blocks, remaining[book_id])
            if words <= 0:
                continue
            remaining[book_id] -= words
            idx += 1
            yield day, idx, book, minutes, words


def _clip_session(book: Book, settings: Settings, blocks: int, remaining_words: int) -> tuple[int, int]:
    if remaining_words <= 0:
        return 0, 0
    max_minutes = blocks * settings.time_quantum_minutes
    max_words = blocks * words_per_block(book, settings)
    words = min(max_words, remaining_words)
    if words <= 0:
        return 0, 0
    minutes = min(max_minutes, math.ceil(words / words_per_minute(book, settings)))
    return minutes, words


def write_schedule_csv(path: str, rows: list[dict[str, object]]) -> None:
    fields = ["date", "session_index", "book_id", "title", "minutes", "words_planned"]
    with Path(path).open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
