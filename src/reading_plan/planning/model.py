"""Utilities for model."""

from __future__ import annotations

from dataclasses import dataclass
import logging
from typing import TYPE_CHECKING

from reading_plan.planning.budget import (
    book_day_block_limit,
    book_is_scheduled_for_day,
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
        CpModelLike,
        CpModelModuleLike,
        FinishedVars,
        IntVarLike,
        LinearExprLike,
    )


LOGGER = logging.getLogger("reading_plan.bridge")
DEPENDENCY_PROGRESS_LOG_INTERVAL = 25


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
            if not book_is_scheduled_for_day(book, day):
                upper = 0
            key = (book.book_id, day)
            x[key] = context.model.new_int_var(
                0,
                upper,
                f"x_{book_index}_{day_index}",
            )
            y[key] = context.model.new_bool_var(f"y_{book_index}_{day_index}")
            context.model.add(x[key] <= upper * y[key])
            context.model.add(x[key] >= book.min_blocks_per_session * y[key])
    return x, y


def _add_day_constraints(context: ModelBuildContext) -> None:
    """Apply daily capacity and session-count limits."""
    for day in context.days:
        context.model.add(
            sum(context.x[book.book_id, day] for book in context.books)
            <= context.caps[day]
        )
        context.model.add(
            sum(context.y[book.book_id, day] for book in context.books)
            <= context.settings.max_books_per_day
        )
        context.model.add(
            sum(context.y[book.book_id, day] for book in context.books)
            <= context.settings.max_sessions_per_day
        )


def _build_progress_before_by_day(
    context: ModelBuildContext,
    blocker: Book,
    blocker_index: int,
) -> dict[date, IntVarLike]:
    """Build prefix-progress vars: words read before each day for one blocker."""
    progress_before_by_day: dict[date, IntVarLike] = {}
    max_progress = blocker.words_total + context.wpb[blocker.book_id] * max(
        1,
        blocker.min_blocks_per_session - 1,
    )
    progressed_before: LinearExprLike = 0
    for day_index, day in enumerate(context.days):
        before_var = context.model.new_int_var(
            0,
            max_progress,
            f"dep_progress_before_{blocker_index}_{day_index}",
        )
        context.model.add(before_var == progressed_before)
        progress_before_by_day[day] = before_var
        progressed_before = (
            before_var
            + context.wpb[blocker.book_id] * context.x[blocker.book_id, day]
        )
    return progress_before_by_day


def _add_dependency_constraints(context: ModelBuildContext) -> None:
    """Prevent scheduling a blocked book before its blocker is complete."""
    dependency_cache: dict[str, dict[date, IntVarLike]] = {}
    blocker_index_map = {
        book.book_id: index
        for index, book in enumerate(context.books)
    }
    dependent_count = 0

    for book in context.books:
        blocker_id = book.blocked_by
        if not blocker_id:
            continue
        dependent_count += 1
        blocker = context.book_map[blocker_id]

        if blocker_id not in dependency_cache:
            dependency_cache[blocker_id] = _build_progress_before_by_day(
                context,
                blocker,
                blocker_index_map[blocker_id],
            )

        progress_before_by_day = dependency_cache[blocker_id]
        for day in context.days:
            context.model.add(
                progress_before_by_day[day]
                >= blocker.words_total * context.y[book.book_id, day]
            )

        if dependent_count % DEPENDENCY_PROGRESS_LOG_INTERVAL == 0:
            LOGGER.debug(
                "build_cp_sat: dependency constraints progress",
                extra={
                    "cached_blocker_count": len(dependency_cache),
                    "dependent_count": dependent_count,
                },
            )

    LOGGER.debug(
        "build_cp_sat: dependency constraints internal done",
        extra={
            "cached_blocker_count": len(dependency_cache),
            "dependent_count": dependent_count,
        },
    )


def _add_progress_constraints(
    context: ModelBuildContext,
) -> tuple[FinishedVars, dict[str, IntVarLike]]:
    """Link reading progress to completion, useful-words, and deadlines."""
    finished: FinishedVars = {}
    useful_words: dict[str, IntVarLike] = {}
    for book_index, book in enumerate(context.books):
        progress = sum(
            context.wpb[book.book_id] * context.x[book.book_id, day]
            for day in context.days
        )
        overshoot = context.wpb[book.book_id] * max(
            1,
            book.min_blocks_per_session - 1,
        )
        context.model.add(progress <= book.words_total + overshoot)

        useful_words[book.book_id] = context.model.new_int_var(
            0, book.words_total, f"u_{book_index}"
        )
        context.model.add(useful_words[book.book_id] <= progress)
        context.model.add(useful_words[book.book_id] <= book.words_total)

        finished[book.book_id] = context.model.new_bool_var(f"f_{book_index}")
        context.model.add(progress >= book.words_total * finished[book.book_id])

        if not book.deadline:
            continue
        if due_days := [day for day in context.days if day <= book.deadline]:
            context.model.add(
                sum(
                    context.wpb[book.book_id] * context.x[book.book_id, day]
                    for day in due_days
                )
                >= book.words_total
            )
    return finished, useful_words


@dataclass
class ModelBuildContext:
    """Shared state used while building the planner CP-SAT model."""

    model: CpModelLike
    books: list[Book]
    days: list[date]
    caps: dict[date, int]
    settings: Settings
    wpb: dict[str, int]
    book_map: dict[str, Book]
    x: BookDayVars
    y: BookDayVars


def build_cp_sat(
    books: list[Book],
    settings: Settings,
    cp_model_module: CpModelModuleLike,
) -> BuildCpSatResult:
    """Build cp sat."""
    LOGGER.debug("build_cp_sat: started", extra={"book_count": len(books)})

    raw_model = cp_model_module.CpModel()
    model = raw_model
    days = date_range(settings.start_date, settings.end_date)
    caps = {d: day_capacity_blocks(settings, d) for d in days}
    wpb = {b.book_id: words_per_block(b, settings) for b in books}
    book_map = {book.book_id: book for book in books}
    LOGGER.debug(
        "build_cp_sat: base calendar and budgets built",
        extra={"day_count": len(days)},
    )

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
    LOGGER.debug(
        "build_cp_sat: decision variables created",
        extra={"variable_count": len(context.x)},
    )

    _add_day_constraints(context)
    LOGGER.debug("build_cp_sat: day constraints added")

    _add_dependency_constraints(context)
    LOGGER.debug("build_cp_sat: dependency constraints added")

    finished, useful_words = _add_progress_constraints(context)
    LOGGER.debug("build_cp_sat: progress constraints added")

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
    model.maximize(sum(terms))
    LOGGER.debug(
        "build_cp_sat: objective added",
        extra={"term_count": len(terms)},
    )

    return raw_model, context.x, context.y, finished, days
