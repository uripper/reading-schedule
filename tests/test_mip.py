from __future__ import annotations

from datetime import date

import pytest

pytest.importorskip("ortools")

from reading_plan.budget import words_per_block
from reading_plan.solve import solve_plan
from tests.helpers import demo_books, demo_settings


def test_mip_does_not_overread_books_far_past_completion():
    books = demo_books()
    settings = demo_settings(end_date=date(2026, 4, 30), w_switch=0.0)
    result = solve_plan(books, settings, planner="mip")
    assert result.status in {"OPTIMAL", "FEASIBLE"}

    wpb = {b.book_id: words_per_block(b, settings) for b in books}
    for book in books:
        planned = sum(v * wpb[book.book_id] for (bid, _), v in result.assignments.items() if bid == book.book_id)
        overshoot = wpb[book.book_id] * max(0, book.min_blocks_per_session - 1)
        assert planned <= book.words_total + overshoot
