"""Utilities for greedy."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
import math
from typing import TYPE_CHECKING

from reading_plan.planner_types import PLAN_MODE_SPREAD_OUT
from reading_plan.planning.budget import (
    book_day_block_limit,
    day_capacity_blocks,
    words_per_block,
)
from reading_plan.reading_calendar import date_range

if TYPE_CHECKING:
    from reading_plan.planner_types import Book, Settings


@dataclass
class DayState:
    """Mutable state for planning one day of greedy assignments."""

    ordered: list[Book]
    used: list[Book]
    remaining: dict[str, float]
    assignments: dict[tuple[str, date], int]
    limits: dict[str, int]
    wpb: dict[str, int]
    day: date
    cap: int
    daily_book_cap: int


@dataclass
class SpreadState:
    """Inputs for spread-mode daily capacity targeting."""

    days: list[date]
    day_index: int
    caps: dict[date, int]
    remaining: dict[str, float]
    wpb: dict[str, int]
    ordered: list[Book]


def plan_greedy(
    books: list[Book], settings: Settings
) -> dict[tuple[str, date], int]:
    """Build a feasible day-by-day block allocation using greedy heuristics."""
    days = date_range(settings.start_date, settings.end_date)
    caps = {day: day_capacity_blocks(settings, day) for day in days}
    remaining = {b.book_id: float(b.words_total) for b in books}
    wpb = {b.book_id: words_per_block(b, settings) for b in books}
    limits = {b.book_id: book_day_block_limit(b, settings) for b in books}
    assignments: dict[tuple[str, date], int] = {}
    daily_book_cap = min(
        settings.max_books_per_day, settings.max_sessions_per_day
    )

    for day_index, day in enumerate(days):
        cap = caps[day]
        if cap <= 0:
            continue
        ordered = sorted(books, key=lambda b: _sort_key(b, remaining))
        if settings.plan_mode == PLAN_MODE_SPREAD_OUT:
            cap = min(
                cap,
                _spread_cap_for_day(
                    SpreadState(
                        days=days,
                        day_index=day_index,
                        caps=caps,
                        remaining=remaining,
                        wpb=wpb,
                        ordered=ordered,
                    )
                ),
            )
        if cap <= 0:
            continue
        state = DayState(
            ordered,
            [],
            remaining,
            assignments,
            limits,
            wpb,
            day,
            cap,
            daily_book_cap,
        )
        _seed_day(state)
        _fill_day(state)

    return {k: v for k, v in assignments.items() if v > 0}


def _seed_day(state: DayState) -> None:
    """Seed a day with minimum sessions for top unlocked books."""
    for book in state.ordered:
        if len(state.used) >= state.daily_book_cap:
            return
        if (
            state.cap < book.min_blocks_per_session
            or state.remaining[book.book_id] <= 0
            or not _is_unlocked(book, state.remaining)
        ):
            continue
        room = _room(state, book.book_id)
        if room < book.min_blocks_per_session:
            continue
        _assign_blocks(state, book, book.min_blocks_per_session)
        state.used.append(book)


def _fill_day(state: DayState) -> None:
    """Fill daily capacity from active books before introducing new ones."""
    while state.cap > 0:
        if active := [
            b
            for b in state.used
            if state.remaining[b.book_id] > 0
            and _is_unlocked(b, state.remaining)
            and _room(state, b.book_id) > 0
        ]:
            top = min(
                active, key=lambda b: (b.priority, b.difficulty, b.book_id)
            )
            _assign_blocks(state, top, 1)
            continue
        nxt = _next_book(state)
        if not nxt:
            return
        _assign_blocks(state, nxt, nxt.min_blocks_per_session)
        state.used.append(nxt)


def _assign_blocks(state: DayState, book: Book, blocks: int) -> None:
    """Assign blocks to one book/day and reduce remaining words and capacity."""
    key = (book.book_id, state.day)
    state.assignments[key] = state.assignments.get(key, 0) + blocks
    state.remaining[book.book_id] = max(
        0.0,
        state.remaining[book.book_id] - blocks * state.wpb[book.book_id],
    )
    state.cap -= blocks


def _sort_key(
    book: Book, remaining: dict[str, float]
) -> tuple[int, date, float, str]:
    """Rank books by priority, deadline, and remaining words for ordering."""
    due = book.deadline or date.max
    return book.priority, due, -remaining[book.book_id], book.book_id


def _next_book(state: DayState) -> Book | None:
    """Select the next eligible book that can start a valid session today."""
    if len(state.used) >= state.daily_book_cap:
        return None
    for book in state.ordered:
        if book in state.used or state.remaining[book.book_id] <= 0:
            continue
        if not _is_unlocked(book, state.remaining):
            continue
        if (
            state.cap >= book.min_blocks_per_session
            and _room(state, book.book_id) >= book.min_blocks_per_session
        ):
            return book
    return None


def _room(state: DayState, book_id: str) -> int:
    """Return remaining per-day block capacity for a specific book."""
    assigned = state.assignments.get((book_id, state.day), 0)
    return state.limits[book_id] - assigned


def _is_unlocked(book: Book, remaining: dict[str, float]) -> bool:
    """Return whether unlocked."""
    blocker = book.blocked_by
    return remaining.get(blocker, 0.0) <= 0.0 if blocker else True


def _spread_cap_for_day(state: SpreadState) -> int:
    """Compute a daily cap that spreads remaining work across active days."""
    remaining_blocks = sum(
        math.ceil(words_left / state.wpb[book_id])
        for book_id, words_left in state.remaining.items()
        if words_left > 0 and state.wpb.get(book_id, 0) > 0
    )
    if remaining_blocks <= 0:
        return 0
    active_days_left = sum(
        state.caps[day] > 0 for day in state.days[state.day_index :]
    )
    if active_days_left <= 0:
        return remaining_blocks
    target = math.ceil(remaining_blocks / active_days_left)
    min_seed = min(
        (
            book.min_blocks_per_session
            for book in state.ordered
            if state.remaining[book.book_id] > 0
            and _is_unlocked(book, state.remaining)
        ),
        default=0,
    )
    if min_seed > 0:
        target = max(target, min_seed)
    return target
