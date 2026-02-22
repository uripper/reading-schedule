"""Utilities for model objective."""

from __future__ import annotations

from datetime import date

from ortools.sat.python import cp_model

from ..types import Book, PLAN_MODE_SPREAD_OUT, Settings


def _priority_weights(books: list[Book]) -> dict[str, int]:
    """Convert 1..5 priority values into larger-is-better objective weights."""
    weights: dict[str, int] = {}
    for book in books:
        priority_value = int(book.priority)
        assert (
            1 <= priority_value <= 5
        ), f"priority must be 1..5, got {book.priority} for {book.book_id}"
        weights[book.book_id] = 6 - priority_value
    return weights


def build_objective_terms(
    books: list[Book],
    settings: Settings,
    days: list[date],
    useful_words: dict[str, cp_model.IntVar],
    finished: dict[str, cp_model.IntVar],
    y: dict[tuple[str, date], cp_model.IntVar],
    x: dict[tuple[str, date], cp_model.IntVar],
) -> list[cp_model.LinearExpr]:
    """Build objective terms."""
    priority_scale = max(1, int(round(settings.w_priority * 100)))
    switch_scale = int(round(settings.w_switch * 100))
    finish_scale = max(1, int(round(settings.w_finish * 10000)))
    mode_scale = max(1, int(round((settings.w_smooth + 1.0) * 10)))

    switch_sign = 1 if settings.plan_mode == PLAN_MODE_SPREAD_OUT else -1
    priority_weights = _priority_weights(books)
    terms: list[cp_model.LinearExpr] = []
    for book in books:
        weight = priority_weights[book.book_id]
        terms.extend(
            (
                priority_scale * weight * useful_words[book.book_id],
                finish_scale * weight * finished[book.book_id],
            )
        )
        for day_index, day in enumerate(days):
            terms.append((switch_sign * switch_scale) * y[(book.book_id, day)])
            if settings.plan_mode != PLAN_MODE_SPREAD_OUT:
                terms.append(
                    mode_scale * (len(days) - day_index) * x[(book.book_id, day)]
                )

    return terms
