from __future__ import annotations

import csv
from datetime import date
from pathlib import Path

from .budget import words_per_block
from .calendar import date_range
from .types import Book, Settings


def to_schedule_rows(
    books: list[Book],
    settings: Settings,
    assignments: dict[tuple[str, date], int],
) -> list[dict[str, object]]:
    book_map = {b.book_id: b for b in books}
    rows: list[dict[str, object]] = []
    for day in date_range(settings.start_date, settings.end_date):
        day_items = [(bid, blk) for (bid, d), blk in assignments.items() if d == day and blk > 0]
        day_items.sort(key=lambda x: (-book_map[x[0]].priority, x[0]))
        for idx, (book_id, blocks) in enumerate(day_items, start=1):
            book = book_map[book_id]
            minutes = blocks * settings.time_quantum_minutes
            words = blocks * words_per_block(book, settings)
            rows.append(
                {
                    "date": day.isoformat(),
                    "session_index": idx,
                    "book_id": book.book_id,
                    "title": book.title,
                    "minutes": minutes,
                    "words_planned": words,
                }
            )
    return rows


def write_schedule_csv(path: str, rows: list[dict[str, object]]) -> None:
    fields = ["date", "session_index", "book_id", "title", "minutes", "words_planned"]
    with Path(path).open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
