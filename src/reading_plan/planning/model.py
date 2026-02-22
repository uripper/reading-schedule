"""Utilities for model."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from ortools.sat.python import cp_model

from reading_plan.planning.budget import (
    book_day_block_limit,
    day_capacity_blocks,
    words_per_block,
)
from reading_plan.planning.model_objective import (
    ObjectiveContext,
    build_objective_terms,
)
from reading_plan.reading_calendar import date_range

if TYPE_CHECKING:
    from datetime import date

    from reading_plan.planner_types import Book, Settings
    from reading_plan.planning.model_types import (
        BookDayVars,
        BuildCpSatResult,
        FinishedVars,
    )


def _create_book_day_variables(
    context: ModelBuildContext,
) -> tuple[BookDayVars, BookDayVars]:
    """Create per-book and per-day decision variables."""
    x: BookDayVars = {}
    y: BookDayVars = {}
    for book_index, book in enumerate(context.books):
        per_book_cap = book_day_block_limit(book, context.settings)
        for day_index, day in enumerate(context.days):
            upper = min(context.caps[day], per_book_cap)
            key = (book.book_id, day)
            x[key] = context.model.NewIntVar(
                0,
                upper,
                f"x_{book_index}_{day_index}",
            )
            y[key] = context.model.NewBoolVar(f"y_{book_index}_{day_index}")
            context.model.Add(x[key] <= upper * y[key])
            context.model.Add(x[key] >= book.min_blocks_per_session * y[key])
    return x, y


def _add_day_constraints(context: ModelBuildContext) -> None:
    """Apply daily capacity and session-count limits."""
    for day in context.days:
        context.model.Add(
            sum(context.x[book.book_id, day] for book in context.books)
            <= context.caps[day]
        )
        context.model.Add(
            sum(context.y[book.book_id, day] for book in context.books)
            <= context.settings.max_books_per_day
        )
        context.model.Add(
            sum(context.y[book.book_id, day] for book in context.books)
            <= context.settings.max_sessions_per_day
        )


def _add_dependency_constraints(context: ModelBuildContext) -> None:
    """Prevent scheduling a blocked book before its blocker is complete."""
    for book_index, book in enumerate(context.books):
        blocker_id = book.blocked_by
        if not blocker_id:
            continue
        blocker = context.book_map[blocker_id]
        for day_index, day in enumerate(context.days):
            progressed_before = sum(
                context.wpb[blocker_id] * context.x[blocker_id, prev_day]
                for prev_day in context.days[:day_index]
            )
            blocker_done = context.model.NewBoolVar(
                f"ready_{book_index}_{day_index}"
            )
            at_or_above_target = context.model.Add(
                progressed_before >= blocker.words_total
            )
            at_or_above_target.OnlyEnforceIf(blocker_done)
            below_target = context.model.Add(
                progressed_before <= blocker.words_total - 1
            )
            below_target.OnlyEnforceIf(blocker_done.Not())
            context.model.Add(context.y[book.book_id, day] <= blocker_done)


def _add_progress_constraints(
    context: ModelBuildContext,
) -> tuple[FinishedVars, dict[str, cp_model.IntVar]]:
    """Link reading progress to completion, useful-words, and deadlines."""
    finished: FinishedVars = {}
    useful_words: dict[str, cp_model.IntVar] = {}
    for book_index, book in enumerate(context.books):
        progress = sum(
            context.wpb[book.book_id] * context.x[book.book_id, day]
            for day in context.days
        )
        overshoot = context.wpb[book.book_id] * max(
            1,
            book.min_blocks_per_session - 1,
        )
        context.model.Add(progress <= book.words_total + overshoot)

        useful_words[book.book_id] = context.model.NewIntVar(
            0, book.words_total, f"u_{book_index}"
        )
        context.model.Add(useful_words[book.book_id] <= progress)
        context.model.Add(useful_words[book.book_id] <= book.words_total)

        finished[book.book_id] = context.model.NewBoolVar(f"f_{book_index}")
        context.model.Add(progress >= book.words_total * finished[book.book_id])

        if not book.deadline:
            continue
        if due_days := [
            day for day in context.days if day <= book.deadline
        ]:
            context.model.Add(
                sum(
                    context.wpb[book.book_id] * context.x[book.book_id, day]
                    for day in due_days
                )
                >= book.words_total
            )
    return finished, useful_words


@dataclass(frozen=True)
class ModelBuildContext:
    """Shared state used while building the planner CP-SAT model."""

    model: cp_model.CpModel
    books: list[Book]
    days: list[date]
    caps: dict[date, int]
    settings: Settings
    wpb: dict[str, int]
    book_map: dict[str, Book]
    x: BookDayVars
    y: BookDayVars


def build_cp_sat(books: list[Book], settings: Settings) -> BuildCpSatResult:
    """Build cp sat."""
    raw_model = cp_model.CpModel()
    model = raw_model
    days = date_range(settings.start_date, settings.end_date)
    caps = {d: day_capacity_blocks(settings, d) for d in days}
    wpb = {b.book_id: words_per_block(b, settings) for b in books}
    book_map = {book.book_id: book for book in books}
    context = ModelBuildContext(
        model=model,
        books=books,
        days=days,
        caps=caps,
        settings=settings,
        wpb=wpb,
        book_map=book_map,
        x={},
        y={},
    )
    context.x, context.y = _create_book_day_variables(context)
    _add_day_constraints(context)
    _add_dependency_constraints(context)
    finished, useful_words = _add_progress_constraints(context)

    terms = build_objective_terms(
        books,
        ObjectiveContext(
            settings=settings,
            days=days,
            useful_words=useful_words,
            finished=finished,
            active_flags=context.y,
            assigned_blocks=context.x,
        ),
    )
    model.Maximize(sum(terms))

    return raw_model, context.x, context.y, finished, days
