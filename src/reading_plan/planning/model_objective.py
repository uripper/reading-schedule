"""Utilities for model objective."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from reading_plan.planner_types import PLAN_MODE_SPREAD_OUT

if TYPE_CHECKING:
    from datetime import date

    from ortools.sat.python import cp_model

    from reading_plan.planner_types import Book, Settings


@dataclass(frozen=True)
class ObjectiveContext:
    """Container for CP-SAT objective construction inputs."""

    settings: Settings
    days: list[date]
    useful_words: dict[str, cp_model.IntVar]
    finished: dict[str, cp_model.IntVar]
    active_flags: dict[tuple[str, date], cp_model.IntVar]
    assigned_blocks: dict[tuple[str, date], cp_model.IntVar]


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


def build_objective_terms(
    books: list[Book],
    context: ObjectiveContext,
) -> list[cp_model.LinearExpr]:
    """Build objective terms."""
    priority_scale = max(1, round(context.settings.w_priority * 100))
    switch_scale = round(context.settings.w_switch * 100)
    finish_scale = max(1, round(context.settings.w_finish * 10000))
    mode_scale = max(1, round((context.settings.w_smooth + 1.0) * 10))

    switch_sign = (
        1 if context.settings.plan_mode == PLAN_MODE_SPREAD_OUT else -1
    )
    priority_weights = _priority_weights(books)
    terms: list[cp_model.LinearExpr] = []
    for book in books:
        weight = priority_weights[book.book_id]
        terms.extend((
            priority_scale * weight * context.useful_words[book.book_id],
            finish_scale * weight * context.finished[book.book_id],
        ))
        for day_index, day in enumerate(context.days):
            terms.append(
                (switch_sign * switch_scale)
                * context.active_flags[book.book_id, day]
            )
            if context.settings.plan_mode != PLAN_MODE_SPREAD_OUT:
                terms.append(
                    mode_scale
                    * (len(context.days) - day_index)
                    * context.assigned_blocks[book.book_id, day]
                )

    return terms
