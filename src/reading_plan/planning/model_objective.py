"""Construct CP-SAT objective terms that score competing scheduling goals."""

from dataclasses import dataclass
from typing import TYPE_CHECKING

from reading_plan.planner_types import PLAN_MODE_SPREAD_OUT


if TYPE_CHECKING:
    from datetime import date

    from reading_plan.planner_types import Book, Settings
    from reading_plan.planning.model_types import (
        BookDayVars,
        FinishedVars,
        IntVarLike,
        LinearExprLike,
    )


@dataclass
class ObjectiveContext:
    """Container for CP-SAT objective construction inputs."""

    # Planner settings containing the objective weights and mode.
    settings: Settings
    # Ordered planning days used for time-based objective shaping.
    days: list[date]
    # Integer vars representing useful progress per book.
    useful_words: dict[str, IntVarLike]
    # Boolean completion vars keyed by book id.
    finished: FinishedVars
    # Boolean activity vars keyed by book/day pair.
    active_flags: BookDayVars
    # Assigned-block vars keyed by book/day pair.
    assigned_blocks: BookDayVars


@dataclass(frozen=True)
class ObjectiveScales:
    """Precomputed integer scales for objective term construction."""

    finish: int
    mode: int
    priority: int
    switch: int
    switch_sign: int


def _priority_weights(books: list[Book]) -> dict[str, int]:
    """Convert 1..5 priority values into larger-is-better objective weights."""
    weights: dict[str, int] = {}
    priority_min = 1
    priority_max = 5
    for book in books:
        priority_value = int(book.priority)
        if priority_min <= priority_value <= priority_max:
            weights[book.book_id] = (priority_max + 1) - priority_value
            continue
        msg = (
            f"priority must be {priority_min}..{priority_max}, "
            f"got {book.priority} for {book.book_id}"
        )
        raise ValueError(msg)
    return weights


def _objective_scales(context: ObjectiveContext) -> ObjectiveScales:
    """Return integer-scaled weights for the active objective config."""
    switch_sign = (
        1 if context.settings.plan_mode == PLAN_MODE_SPREAD_OUT else -1
    )
    return ObjectiveScales(
        finish=max(1, round(context.settings.w_finish * 10000)),
        mode=max(1, round((context.settings.w_smooth + 1.0) * 10)),
        priority=max(1, round(context.settings.w_priority * 100)),
        switch=round(context.settings.w_switch * 100),
        switch_sign=switch_sign,
    )


def _day_terms(
    book: Book,
    context: ObjectiveContext,
    day_index: int,
    scales: ObjectiveScales,
) -> list[LinearExprLike]:
    """Build per-day objective terms for one book."""
    day = context.days[day_index]
    terms: list[LinearExprLike] = [
        (scales.switch_sign * scales.switch)
        * context.active_flags[book.book_id, day]
    ]
    if context.settings.plan_mode == PLAN_MODE_SPREAD_OUT:
        return terms
    terms.append(
        scales.mode
        * (len(context.days) - day_index)
        * context.assigned_blocks[book.book_id, day]
    )
    return terms


def _book_terms(
    book: Book,
    context: ObjectiveContext,
    priority_weights: dict[str, int],
    scales: ObjectiveScales,
) -> list[LinearExprLike]:
    """Build all objective terms contributed by one book."""
    weight = priority_weights[book.book_id]
    terms: list[LinearExprLike] = [
        scales.priority * weight * context.useful_words[book.book_id],
        scales.finish * weight * context.finished[book.book_id],
    ]
    for day_index, _day in enumerate(context.days):
        terms.extend(_day_terms(book, context, day_index, scales))
    return terms


def build_objective_terms(
    books: list[Book],
    context: ObjectiveContext,
) -> list[LinearExprLike]:
    """Build objective terms."""
    scales = _objective_scales(context)
    priority_weights = _priority_weights(books)
    terms: list[LinearExprLike] = []
    for book in books:
        terms.extend(
            _book_terms(
                book,
                context,
                priority_weights,
                scales,
            )
        )
    return terms
