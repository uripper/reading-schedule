"""Utilities for model."""

from __future__ import annotations

from typing import TYPE_CHECKING

from ortools.sat.python import cp_model

from reading_plan.calendar import date_range
from reading_plan.planning.budget import (
    book_day_block_limit,
    day_capacity_blocks,
    words_per_block,
)
from reading_plan.planning.model_objective import build_objective_terms

if TYPE_CHECKING:
    from datetime import date

    from reading_plan.planner_types import Book, Settings
    from reading_plan.planning.model_types import (
        BookDayVars,
        BuildCpSatResult,
        FinishedVars,
    )


def _create_book_day_variables(
    model: cp_model.CpModel,
    books: list[Book],
    days: list[date],
    caps: dict[date, int],
    settings: Settings,
) -> tuple[BookDayVars, BookDayVars]:
    """Create per-book and per-day decision variables."""
    x: BookDayVars = {}
    y: BookDayVars = {}
    for book_index, book in enumerate(books):
        per_book_cap = book_day_block_limit(book, settings)
        for day_index, day in enumerate(days):
            upper = min(caps[day], per_book_cap)
            key = (book.book_id, day)
            x[key] = model.NewIntVar(0, upper, f"x_{book_index}_{day_index}")
            y[key] = model.NewBoolVar(f"y_{book_index}_{day_index}")
            model.Add(x[key] <= upper * y[key])
            model.Add(x[key] >= book.min_blocks_per_session * y[key])
    return x, y


def _add_day_constraints(
    model: cp_model.CpModel,
    books: list[Book],
    days: list[date],
    x: BookDayVars,
    y: BookDayVars,
    caps: dict[date, int],
    settings: Settings,
) -> None:
    """Apply daily capacity and session-count limits."""
    for day in days:
        model.Add(sum(x[book.book_id, day] for book in books) <= caps[day])
        model.Add(
            sum(y[book.book_id, day] for book in books)
            <= settings.max_books_per_day
        )
        model.Add(
            sum(y[book.book_id, day] for book in books)
            <= settings.max_sessions_per_day
        )


def _add_dependency_constraints(
    model: cp_model.CpModel,
    books: list[Book],
    days: list[date],
    x: BookDayVars,
    y: BookDayVars,
    wpb: dict[str, int],
    book_map: dict[str, Book],
) -> None:
    """Prevent scheduling a blocked book before its blocker is complete."""
    for book_index, book in enumerate(books):
        blocker_id = book.blocked_by
        if not blocker_id:
            continue
        blocker = book_map[blocker_id]
        for day_index, day in enumerate(days):
            progressed_before = sum(
                wpb[blocker_id] * x[blocker_id, prev_day]
                for prev_day in days[:day_index]
            )
            blocker_done = model.NewBoolVar(f"ready_{book_index}_{day_index}")
            at_or_above_target = model.Add(
                progressed_before >= blocker.words_total
            )
            at_or_above_target.OnlyEnforceIf(blocker_done)
            below_target = model.Add(
                progressed_before <= blocker.words_total - 1
            )
            below_target.OnlyEnforceIf(blocker_done.Not())
            model.Add(y[book.book_id, day] <= blocker_done)


def _add_progress_constraints(
    model: cp_model.CpModel,
    books: list[Book],
    days: list[date],
    x: BookDayVars,
    wpb: dict[str, int],
) -> tuple[FinishedVars, dict[str, cp_model.IntVar]]:
    """Link reading progress to completion, useful-words, and deadlines."""
    finished: FinishedVars = {}
    useful_words: dict[str, cp_model.IntVar] = {}
    for book_index, book in enumerate(books):
        progress = sum(wpb[book.book_id] * x[book.book_id, day] for day in days)
        overshoot = wpb[book.book_id] * max(1, book.min_blocks_per_session - 1)
        model.Add(progress <= book.words_total + overshoot)

        useful_words[book.book_id] = model.NewIntVar(
            0, book.words_total, f"u_{book_index}"
        )
        model.Add(useful_words[book.book_id] <= progress)
        model.Add(useful_words[book.book_id] <= book.words_total)

        finished[book.book_id] = model.NewBoolVar(f"f_{book_index}")
        model.Add(progress >= book.words_total * finished[book.book_id])

        if not book.deadline:
            continue
        if due_days := [day for day in days if day <= book.deadline]:
            model.Add(
                sum(
                    wpb[book.book_id] * x[book.book_id, day] for day in due_days
                )
                >= book.words_total
            )
    return finished, useful_words


def build_cp_sat(books: list[Book], settings: Settings) -> BuildCpSatResult:
    """Build cp sat."""
    raw_model = cp_model.CpModel()
    model = raw_model
    days = date_range(settings.start_date, settings.end_date)
    caps = {d: day_capacity_blocks(settings, d) for d in days}
    wpb = {b.book_id: words_per_block(b, settings) for b in books}
    book_map = {book.book_id: book for book in books}
    x, y = _create_book_day_variables(model, books, days, caps, settings)
    _add_day_constraints(model, books, days, x, y, caps, settings)
    _add_dependency_constraints(model, books, days, x, y, wpb, book_map)
    finished, useful_words = _add_progress_constraints(
        model, books, days, x, wpb
    )

    terms = build_objective_terms(
        books, settings, days, useful_words, finished, y, x
    )
    model.Maximize(sum(terms))

    return raw_model, x, y, finished, days
