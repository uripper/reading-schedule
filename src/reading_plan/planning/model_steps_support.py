"""Internal helpers used by CP-SAT model-building steps."""

from __future__ import annotations

from dataclasses import dataclass
import logging
from typing import TYPE_CHECKING

from reading_plan.planning.budget import book_is_scheduled_for_day


if TYPE_CHECKING:
    from datetime import date

    from reading_plan.planner_types import Book
    from reading_plan.planning.model_steps import ModelBuildContext
    from reading_plan.planning.model_types import (
        BookDayVars,
        IntVarLike,
        LinearExprLike,
    )


LOGGER = logging.getLogger("reading_plan.bridge")
DEPENDENCY_PROGRESS_LOG_INTERVAL = 25
MIN_OVERSHOOT_BLOCKS = 1
COMPLETION_GAP = 1


@dataclass
class DependencyConstraintState:
    """Mutable dependency-tracking state for blocker constraints."""

    blocker_index_map: dict[str, int]
    dependency_cache: dict[str, dict[date, IntVarLike]]
    dependent_count: int = 0


def dependency_constraint_state(books: list[Book]) -> DependencyConstraintState:
    """Build shared state for blocker dependency constraints."""
    blocker_index_map = {
        book.book_id: index for index, book in enumerate(books)
    }
    return DependencyConstraintState(blocker_index_map, {})


def apply_book_dependency_constraints(
    book: Book,
    context: ModelBuildContext,
    state: DependencyConstraintState,
) -> bool:
    """Apply blocker constraints for one dependent book."""
    blocker_id = book.blocked_by
    if not blocker_id:
        return False
    state.dependent_count += 1
    blocker = context.book_map[blocker_id]
    progress_before_by_day = dependency_progress_before_by_day(
        blocker,
        state.blocker_index_map,
        context,
        state.dependency_cache,
    )
    add_dependency_day_constraints(
        blocker,
        book,
        context,
        progress_before_by_day,
    )
    return True


def log_dependency_progress(state: DependencyConstraintState) -> None:
    """Log periodic progress while adding dependency constraints."""
    if state.dependent_count == 0:
        return
    if state.dependent_count % DEPENDENCY_PROGRESS_LOG_INTERVAL != 0:
        return
    LOGGER.debug(
        "build_cp_sat: dependency constraints progress",
        extra={
            "cached_blocker_count": len(state.dependency_cache),
            "dependent_count": state.dependent_count,
        },
    )


def log_dependency_completion(state: DependencyConstraintState) -> None:
    """Log final dependency constraint summary."""
    LOGGER.debug(
        "build_cp_sat: dependency constraints internal done",
        extra={
            "cached_blocker_count": len(state.dependency_cache),
            "dependent_count": state.dependent_count,
        },
    )


def dependency_progress_before_by_day(
    blocker: Book,
    blocker_index_map: dict[str, int],
    context: ModelBuildContext,
    dependency_cache: dict[str, dict[date, IntVarLike]],
) -> dict[date, IntVarLike]:
    """Return cached prefix-progress vars for one blocker book."""
    blocker_id = blocker.book_id
    if blocker_id not in dependency_cache:
        dependency_cache[blocker_id] = build_progress_before_by_day(
            context,
            blocker,
            blocker_index_map[blocker_id],
        )
    return dependency_cache[blocker_id]


def add_dependency_day_constraints(
    blocker: Book,
    book: Book,
    context: ModelBuildContext,
    progress_before_by_day: dict[date, IntVarLike],
) -> None:
    """Prevent a dependent book from starting before its blocker progresses."""
    for day in context.days:
        context.model.Add(
            progress_before_by_day[day]
            >= blocker.remaining_words * context.y[book.book_id, day]
        )


def build_progress_before_by_day(
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


def book_progress(
    book: Book,
    context: ModelBuildContext,
) -> LinearExprLike:
    """Return the linear progress expression for one book."""
    return sum(
        context.wpb[book.book_id] * context.x[book.book_id, day]
        for day in context.days
    )


def max_progress(
    book: Book,
    context: ModelBuildContext,
) -> int:
    """Return the maximum allowed progress including overshoot."""
    overshoot = context.wpb[book.book_id] * max(
        MIN_OVERSHOOT_BLOCKS,
        book.min_blocks_per_session - COMPLETION_GAP,
    )
    return book.remaining_words + overshoot


def useful_word_var(
    book: Book,
    book_index: int,
    context: ModelBuildContext,
    progress: LinearExprLike,
) -> IntVarLike:
    """Create and constrain the useful-word variable for one book."""
    useful_word = context.model.NewIntVar(
        0,
        book.remaining_words,
        f"u_{book_index}",
    )
    context.model.Add(useful_word <= progress)
    context.model.Add(useful_word <= book.remaining_words)
    return useful_word


def add_due_progress_constraint(
    book: Book,
    context: ModelBuildContext,
) -> None:
    """Require completion by the deadline when a deadline exists."""
    if not book.deadline:
        return
    due_days = [day for day in context.days if day <= book.deadline]
    if not due_days:
        return
    due_progress = sum(
        context.wpb[book.book_id] * context.x[book.book_id, day]
        for day in due_days
    )
    context.model.Add(due_progress >= book.remaining_words)


def progress_variables_for_book(
    book: Book,
    book_index: int,
    context: ModelBuildContext,
) -> tuple[str, IntVarLike, IntVarLike]:
    """Create the useful-word and completion variables for one book."""
    progress = book_progress(book, context)
    progress_limit = max_progress(book, context)
    context.model.Add(progress <= progress_limit)
    useful_word = useful_word_var(book, book_index, context, progress)
    finished_var = context.model.NewBoolVar(f"f_{book_index}")
    unfinished_limit = max(book.remaining_words - COMPLETION_GAP, 0)
    context.model.Add(progress >= book.remaining_words * finished_var)
    context.model.Add(
        progress <= unfinished_limit + progress_limit * finished_var
    )
    add_due_progress_constraint(book, context)
    return book.book_id, finished_var, useful_word


def lock_cutoff_day(
    context: ModelBuildContext,
    lock_days_from_start: int,
) -> date | None:
    """Return the last locked day or None when no locking is needed."""
    if lock_days_from_start <= 0:
        return None
    if not context.days:
        return None
    lock_days = min(lock_days_from_start, len(context.days))
    return context.days[lock_days - 1]


def _daily_upper_bound(
    book: Book,
    context: ModelBuildContext,
    day: date,
    per_book_cap: int,
) -> int:
    """Return the allowed block cap for one book on one day."""
    upper = min(context.caps[day], per_book_cap)
    if not book_is_scheduled_for_day(book, day):
        return 0
    return upper


def _new_day_variables(
    book: Book,
    context: ModelBuildContext,
    upper: int,
    variable_suffix: str,
) -> tuple[IntVarLike, IntVarLike]:
    """Create and constrain the daily decision-variable pair."""
    x_var = context.model.NewIntVar(0, upper, f"x_{variable_suffix}")
    y_var = context.model.NewBoolVar(f"y_{variable_suffix}")
    context.model.Add(x_var <= upper * y_var)
    context.model.Add(x_var >= book.min_blocks_per_session * y_var)
    return x_var, y_var


def book_day_variables(
    book: Book,
    book_index: int,
    context: ModelBuildContext,
    per_book_cap: int,
) -> tuple[BookDayVars, BookDayVars]:
    """Create all day-level decision variables for one book."""
    x_vars: BookDayVars = {}
    y_vars: BookDayVars = {}
    for day_index, day in enumerate(context.days):
        upper = _daily_upper_bound(
            book,
            context,
            day,
            per_book_cap,
        )
        key = (book.book_id, day)
        variable_suffix = f"{book_index}_{day_index}"
        x_var, y_var = _new_day_variables(
            book,
            context,
            upper,
            variable_suffix,
        )
        x_vars[key] = x_var
        y_vars[key] = y_var
    return x_vars, y_vars
