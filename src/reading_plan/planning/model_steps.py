"""CP-SAT model-building steps shared by the planner."""

from dataclasses import dataclass
import logging
from typing import TYPE_CHECKING

from reading_plan.planning.budget import (
    book_day_block_limit,
    book_is_scheduled_for_day,
    day_capacity_blocks,
    words_per_block,
)
from reading_plan.reading_calendar import date_range

if TYPE_CHECKING:
    from datetime import date

    from reading_plan.planner_types import Book, Settings
    from reading_plan.planning.model_types import (
        BookDayVars,
        CpModelLike,
        FinishedVars,
        IntVarLike,
    )

LOGGER = logging.getLogger("reading_plan.bridge")
DEPENDENCY_PROGRESS_LOG_INTERVAL = 25
MIN_OVERSHOOT_BLOCKS = 1
COMPLETION_GAP = 1


@dataclass(frozen=True)
class ModelBuildContext:
    """Shared state used while building the planner CP-SAT model."""

    # Active CP-SAT model receiving constraints and objective terms.
    model: CpModelLike
    # Normalized books included in the current planning run.
    books: list[Book]
    # Ordered calendar days covered by the plan window.
    days: list[date]
    # Per-day capacity in planning blocks.
    caps: dict[date, int]
    # Global planner settings for the current run.
    settings: Settings
    # Words-per-block lookup keyed by book id.
    wpb: dict[str, int]
    # Book lookup keyed by book id for dependency and deadline logic.
    book_map: dict[str, Book]
    # Assigned-block decision variables keyed by book/day pair.
    x: BookDayVars
    # Active-session decision variables keyed by book/day pair.
    y: BookDayVars


def create_model_context(
    model: CpModelLike,
    books: list[Book],
    settings: Settings,
) -> ModelBuildContext:
    """Build the static model context and all decision variables."""
    days = date_range(settings.start_date, settings.end_date)
    caps = {day: day_capacity_blocks(settings, day) for day in days}
    wpb = {book.book_id: words_per_block(book, settings) for book in books}
    book_map = {book.book_id: book for book in books}
    base_context = ModelBuildContext(
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
    x_vars, y_vars = _create_book_day_variables(base_context)
    return ModelBuildContext(
        model=model,
        books=books,
        days=days,
        caps=caps,
        settings=settings,
        wpb=wpb,
        book_map=book_map,
        x=x_vars,
        y=y_vars,
    )


def add_day_constraints(context: ModelBuildContext) -> None:
    """Apply daily capacity and active-book limits."""
    for day in context.days:
        assigned_blocks = sum(
            context.x[book.book_id, day] for book in context.books
        )
        active_books = sum(
            context.y[book.book_id, day] for book in context.books
        )
        context.model.Add(assigned_blocks <= context.caps[day])
        context.model.Add(active_books <= context.settings.max_books_per_day)
        context.model.Add(active_books <= context.settings.max_sessions_per_day)


def add_dependency_constraints(context: ModelBuildContext) -> None:
    """Prevent scheduling a blocked book before its blocker is complete."""
    dependency_cache: dict[str, dict[date, IntVarLike]] = {}
    blocker_index_map = {
        book.book_id: index for index, book in enumerate(context.books)
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
            context.model.Add(
                progress_before_by_day[day]
                >= blocker.remaining_words * context.y[book.book_id, day]
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


def add_progress_constraints(
    context: ModelBuildContext,
) -> tuple[FinishedVars, dict[str, IntVarLike]]:
    """Link reading progress to completion, useful words, and deadlines."""
    finished: FinishedVars = {}
    useful_words: dict[str, IntVarLike] = {}
    for book_index, book in enumerate(context.books):
        progress = sum(
            context.wpb[book.book_id] * context.x[book.book_id, day]
            for day in context.days
        )
        overshoot = context.wpb[book.book_id] * max(
            MIN_OVERSHOOT_BLOCKS,
            book.min_blocks_per_session - COMPLETION_GAP,
        )
        max_progress = book.remaining_words + overshoot
        context.model.Add(progress <= max_progress)

        useful_words[book.book_id] = context.model.NewIntVar(
            0,
            book.remaining_words,
            f"u_{book_index}",
        )
        useful_word_var = useful_words[book.book_id]
        context.model.Add(useful_word_var <= progress)
        context.model.Add(useful_word_var <= book.remaining_words)

        finished_var = context.model.NewBoolVar(f"f_{book_index}")
        finished[book.book_id] = finished_var
        unfinished_limit = book.remaining_words - COMPLETION_GAP
        unfinished_limit = max(unfinished_limit, 0)
        context.model.Add(progress >= book.remaining_words * finished_var)
        context.model.Add(
            progress <= unfinished_limit + max_progress * finished_var
        )

        if not book.deadline:
            continue
        due_days = [day for day in context.days if day <= book.deadline]
        if not due_days:
            continue
        due_progress = sum(
            context.wpb[book.book_id] * context.x[book.book_id, day]
            for day in due_days
        )
        context.model.Add(due_progress >= book.remaining_words)
    return finished, useful_words


def add_near_term_lock_constraints(
    context: ModelBuildContext,
    lock_days_from_start: int,
    lock_assignments: dict[tuple[str, date], int] | None,
) -> None:
    """Pin early-day x-vars to provided assignments or zero when absent."""
    if lock_days_from_start <= 0:
        return
    if not context.days:
        return
    assignments = lock_assignments or {}
    lock_days = min(lock_days_from_start, len(context.days))
    lock_cutoff = context.days[lock_days - 1]
    for key, variable in context.x.items():
        _book_id, day = key
        if day > lock_cutoff:
            continue
        fixed_value = assignments.get(key, 0)
        context.model.Add(variable == fixed_value)


def _create_book_day_variables(
    context: ModelBuildContext,
) -> tuple[BookDayVars, BookDayVars]:
    """Create per-book and per-day decision variables."""
    x_vars: BookDayVars = {}
    y_vars: BookDayVars = {}
    for book_index, book in enumerate(context.books):
        per_book_cap = book_day_block_limit(book, context.settings)
        for day_index, day in enumerate(context.days):
            upper = min(context.caps[day], per_book_cap)
            if not book_is_scheduled_for_day(book, day):
                upper = 0
            key = (book.book_id, day)
            x_vars[key] = context.model.NewIntVar(
                0,
                upper,
                f"x_{book_index}_{day_index}",
            )
            y_vars[key] = context.model.NewBoolVar(
                f"y_{book_index}_{day_index}"
            )
            context.model.Add(x_vars[key] <= upper * y_vars[key])
            context.model.Add(
                x_vars[key] >= book.min_blocks_per_session * y_vars[key]
            )
    return x_vars, y_vars


def _build_progress_before_by_day(
    context: ModelBuildContext,
    blocker: Book,
    blocker_index: int,
) -> dict[date, IntVarLike]:
    """Build prefix-progress vars: words read before each day for a blocker."""
    progress_before_by_day: dict[date, IntVarLike] = {}
    max_progress = blocker.remaining_words + context.wpb[blocker.book_id] * max(
        MIN_OVERSHOOT_BLOCKS,
        blocker.min_blocks_per_session - COMPLETION_GAP,
    )
    progressed_before = 0
    for day_index, day in enumerate(context.days):
        before_var = context.model.NewIntVar(
            0,
            max_progress,
            f"dep_progress_before_{blocker_index}_{day_index}",
        )
        context.model.Add(before_var == progressed_before)
        progress_before_by_day[day] = before_var
        progressed_before = (
            before_var
            + context.wpb[blocker.book_id] * context.x[blocker.book_id, day]
        )
    return progress_before_by_day
