from __future__ import annotations

from datetime import date

from .budget import book_day_block_limit, day_capacity_blocks, words_per_block
from .calendar import date_range
from .types import Book, Settings


def plan_greedy(books: list[Book], settings: Settings) -> dict[tuple[str, date], int]:
    days = date_range(settings.start_date, settings.end_date)
    remaining = {b.book_id: float(b.words_total) for b in books}
    wpb = {b.book_id: words_per_block(b, settings) for b in books}
    limits = {b.book_id: book_day_block_limit(b, settings) for b in books}
    assignments: dict[tuple[str, date], int] = {}
    daily_book_cap = min(settings.max_books_per_day, settings.max_sessions_per_day)

    for day in days:
        cap = day_capacity_blocks(settings, day)
        if cap <= 0:
            continue
        ordered = sorted(books, key=lambda b: _sort_key(b, remaining))
        used: list[Book] = []
        cap = _seed_day(ordered, used, remaining, assignments, limits, wpb, day, cap, daily_book_cap)
        _fill_day(ordered, used, remaining, assignments, limits, wpb, day, cap, daily_book_cap)

    return {k: v for k, v in assignments.items() if v > 0}


def _seed_day(ordered: list[Book], used: list[Book], remaining: dict[str, float], assignments: dict[tuple[str, date], int], limits: dict[str, int], wpb: dict[str, int], day: date, cap: int, daily_book_cap: int) -> int:
    for book in ordered:
        if len(used) >= daily_book_cap:
            break
        if cap < book.min_blocks_per_session or remaining[book.book_id] <= 0:
            continue
        room = _room(assignments, book.book_id, day, limits[book.book_id])
        if room < book.min_blocks_per_session:
            continue
        cap = _assign_blocks(assignments, remaining, wpb, book, day, cap, book.min_blocks_per_session)
        used.append(book)
    return cap


def _fill_day(ordered: list[Book], used: list[Book], remaining: dict[str, float], assignments: dict[tuple[str, date], int], limits: dict[str, int], wpb: dict[str, int], day: date, cap: int, daily_book_cap: int) -> None:
    while cap > 0:
        if active := [
            b
            for b in used
            if remaining[b.book_id] > 0
            and _room(assignments, b.book_id, day, limits[b.book_id]) > 0
        ]:
            top = min(active, key=lambda b: (b.priority, b.difficulty, b.book_id))
            cap = _assign_blocks(assignments, remaining, wpb, top, day, cap, 1)
            continue
        nxt = _next_book(ordered, used, remaining, cap, daily_book_cap, assignments, day, limits)
        if not nxt:
            return
        cap = _assign_blocks(assignments, remaining, wpb, nxt, day, cap, nxt.min_blocks_per_session)
        used.append(nxt)


def _assign_blocks(assignments: dict[tuple[str, date], int], remaining: dict[str, float], wpb: dict[str, int], book: Book, day: date, cap: int, blocks: int) -> int:
    key = (book.book_id, day)
    assignments[key] = assignments.get(key, 0) + blocks
    remaining[book.book_id] = max(0.0, remaining[book.book_id] - blocks * wpb[book.book_id])
    return cap - blocks


def _sort_key(book: Book, remaining: dict[str, float]) -> tuple[int, date, float, str]:
    due = book.deadline or date.max
    return (book.priority, due, -remaining[book.book_id], book.book_id)


def _next_book(
    ordered: list[Book],
    used: list[Book],
    remaining: dict[str, float],
    cap: int,
    daily_book_cap: int,
    assignments: dict[tuple[str, date], int],
    day: date,
    limits: dict[str, int],
) -> Book | None:
    if len(used) >= daily_book_cap:
        return None
    for book in ordered:
        if book in used or remaining[book.book_id] <= 0:
            continue
        if cap >= book.min_blocks_per_session and _room(assignments, book.book_id, day, limits[book.book_id]) >= book.min_blocks_per_session:
            return book
    return None


def _room(assignments: dict[tuple[str, date], int], book_id: str, day: date, limit: int) -> int:
    return limit - assignments.get((book_id, day), 0)
