"""CP-SAT model-building steps shared by the planner."""

from dataclasses import dataclass
from typing import TYPE_CHECKING

from reading_plan.planning.budget import (
    book_day_block_limit,
    day_capacity_blocks,
    words_per_block,
)
from reading_plan.planning.model_steps_support import (
    apply_book_dependency_constraints,
    book_day_variables,
    dependency_constraint_state,
    lock_cutoff_day,
    log_dependency_completion,
    log_dependency_progress,
    progress_variables_for_book,
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


@dataclass(frozen=True)
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


def create_model_context(
    model: CpModelLike,
    books: list[Book],
    settings: Settings,
) -> ModelBuildContext:
    """Build the static model context and all decision variables.

    Returns:
        Computed value.
    """
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
            context.x[(book.book_id, day)] for book in context.books
        )
        active_books = sum(
            context.y[(book.book_id, day)] for book in context.books
        )
        context.model.Add(assigned_blocks <= context.caps[day])
        context.model.Add(active_books <= context.settings.max_books_per_day)
        context.model.Add(active_books <= context.settings.max_sessions_per_day)


def add_dependency_constraints(context: ModelBuildContext) -> None:
    """Prevent scheduling a blocked book before its blocker is complete."""
    state = dependency_constraint_state(context.books)
    for book in context.books:
        if not apply_book_dependency_constraints(book, context, state):
            continue
        log_dependency_progress(state)
    log_dependency_completion(state)


def add_progress_constraints(
    context: ModelBuildContext,
) -> tuple[FinishedVars, dict[str, IntVarLike]]:
    """Link reading progress to completion, useful words, and deadlines.

    Returns:
        Computed value.
    """
    finished: FinishedVars = {}
    useful_words: dict[str, IntVarLike] = {}
    for book_index, book in enumerate(context.books):
        book_id, finished_var, useful_word_var = progress_variables_for_book(
            book,
            book_index,
            context,
        )
        finished[book_id] = finished_var
        useful_words[book_id] = useful_word_var
    return finished, useful_words


def add_near_term_lock_constraints(
    context: ModelBuildContext,
    lock_days_from_start: int,
    lock_assignments: dict[tuple[str, date], int] | None,
) -> None:
    """Pin early-day x-vars to provided assignments or zero when absent."""
    lock_cutoff = lock_cutoff_day(context, lock_days_from_start)
    if lock_cutoff is None:
        return
    assignments = lock_assignments or {}
    for key, variable in context.x.items():
        _book_id, day = key
        if day > lock_cutoff:
            continue
        fixed_value = assignments.get(key, 0)
        context.model.Add(variable == fixed_value)


def _create_book_day_variables(
    context: ModelBuildContext,
) -> tuple[BookDayVars, BookDayVars]:
    """Create per-book and per-day decision variables.

    Returns:
        Computed value.
    """
    x_vars: BookDayVars = {}
    y_vars: BookDayVars = {}
    for book_index, book in enumerate(context.books):
        per_book_cap = book_day_block_limit(book, context.settings)
        book_x_vars, book_y_vars = book_day_variables(
            book,
            book_index,
            context,
            per_book_cap=per_book_cap,
        )
        x_vars.update(book_x_vars)
        y_vars.update(book_y_vars)
    return x_vars, y_vars
