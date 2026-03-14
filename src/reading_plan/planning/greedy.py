"""Build feasible schedules greedily under calendar and per-book limits."""

from dataclasses import dataclass
from datetime import date
import math
from typing import TYPE_CHECKING

from reading_plan.planner_types import PLAN_MODE_SPREAD_OUT
from reading_plan.planning.budget import (
    book_day_block_limit,
    book_is_scheduled_for_day,
    day_capacity_blocks,
    words_per_block,
)
from reading_plan.reading_calendar import date_range


if TYPE_CHECKING:
    from reading_plan.planner_types import Book, Settings
    from reading_plan.planning.model_types import Assignments


@dataclass
class DayState:
    """Mutable state for planning one day of greedy assignments."""

    ordered: list[Book]
    used: list[Book]
    remaining: dict[str, float]
    assignments: Assignments
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


@dataclass
class GreedyPlanContext:
    """Shared mutable state across the full greedy planning run."""

    assignments: Assignments
    caps: dict[date, int]
    daily_book_cap: int
    days: list[date]
    limits: dict[str, int]
    remaining: dict[str, float]
    settings: Settings
    wpb: dict[str, int]


def _greedy_cap_for_day(
    context: GreedyPlanContext,
    day: date,
    day_index: int,
    ordered: list[Book],
) -> int:
    """Return the block capacity used for one day's greedy fill."""
    cap = context.caps[day]
    if cap <= 0:
        return 0
    if context.settings.plan_mode != PLAN_MODE_SPREAD_OUT:
        return cap
    return min(
        cap,
        _spread_cap_for_day(
            SpreadState(
                days=context.days,
                day_index=day_index,
                caps=context.caps,
                remaining=context.remaining,
                wpb=context.wpb,
                ordered=ordered,
            )
        ),
    )


def _greedy_plan_context(
    books: list[Book],
    settings: Settings,
) -> GreedyPlanContext:
    """Build the shared mutable state used by greedy planning."""
    days = date_range(settings.start_date, settings.end_date)
    return GreedyPlanContext(
        assignments={},
        caps={day: day_capacity_blocks(settings, day) for day in days},
        daily_book_cap=min(
            settings.max_books_per_day,
            settings.max_sessions_per_day,
        ),
        days=days,
        limits={
            book.book_id: book_day_block_limit(book, settings) for book in books
        },
        remaining={book.book_id: float(book.remaining_words) for book in books},
        settings=settings,
        wpb={book.book_id: words_per_block(book, settings) for book in books},
    )


def _day_state(
    context: GreedyPlanContext,
    cap: int,
    day: date,
    ordered: list[Book],
) -> DayState:
    """Build mutable state for planning one day."""
    return DayState(
        ordered,
        [],
        context.remaining,
        context.assignments,
        context.limits,
        context.wpb,
        day,
        cap,
        context.daily_book_cap,
    )


def _plan_day(state: DayState) -> None:
    """Seed and fill one day of greedy assignments."""
    _seed_day(state)
    _fill_day(state)


def _ordered_books(
    books: list[Book],
    remaining: dict[str, float],
) -> list[Book]:
    """Return books in greedy selection order for the current day."""
    return sorted(books, key=lambda book: _sort_key(book, remaining))


def _positive_assignments(assignments: Assignments) -> Assignments:
    """Drop zero-value assignment entries before returning results."""
    return {key: value for key, value in assignments.items() if value > 0}


def plan_greedy(books: list[Book], settings: Settings) -> Assignments:
    """Build a feasible day-by-day block allocation using greedy heuristics."""
    context = _greedy_plan_context(books, settings)
    for day_index, day in enumerate(context.days):
        ordered = _ordered_books(books, context.remaining)
        cap = _greedy_cap_for_day(context, day, day_index, ordered)
        if cap <= 0:
            continue
        _plan_day(_day_state(context, cap, day, ordered))
    return _positive_assignments(context.assignments)


def _seed_day(state: DayState) -> None:
    """Seed a day with minimum sessions for top unlocked books."""
    for book in state.ordered:
        if len(state.used) >= state.daily_book_cap:
            return
        if (
            state.cap < book.min_blocks_per_session
            or state.remaining[book.book_id] <= 0
            or not _is_unlocked(book, state.remaining)
            or not book_is_scheduled_for_day(book, state.day)
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
            and book_is_scheduled_for_day(b, state.day)
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
    if _day_book_limit_reached(state):
        return None
    return next(
        (book for book in state.ordered if _can_start_book(state, book)), None
    )


def _day_book_limit_reached(state: DayState) -> bool:
    """Return whether the day has already reached its book/session cap."""
    return len(state.used) >= state.daily_book_cap


def _can_start_book(state: DayState, book: Book) -> bool:
    """Return whether a book can start a new session on the current day."""
    if book in state.used or state.remaining[book.book_id] <= 0:
        return False
    can_start = book_is_scheduled_for_day(
        book,
        state.day,
    ) and _is_unlocked(book, state.remaining)
    return can_start and _has_minimum_capacity_for_book(state, book)


def _has_minimum_capacity_for_book(state: DayState, book: Book) -> bool:
    """Return whether the day and book both have room for a minimum session."""
    min_blocks = book.min_blocks_per_session
    if state.cap < min_blocks:
        return False
    return _room(state, book.book_id) >= min_blocks


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
    day = state.days[state.day_index]
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
            and book_is_scheduled_for_day(book, day)
        ),
        default=0,
    )
    if min_seed > 0:
        target = max(target, min_seed)
    return target
