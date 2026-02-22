"""Test cases for test mip."""

from __future__ import annotations

from datetime import date

import pytest

pytest.importorskip("ortools")

from reading_plan.planning.budget import words_per_block
from reading_plan.planning.solve import solve_plan
from reading_plan.types import Book, Settings
from tests.helpers import demo_books, demo_settings


def assert_no_large_overread(
    books: list[Book],
    result_assignments: dict[tuple[str, date], int],
    settings: Settings,
) -> None:
    """Assert each book's assigned words do not exceed allowed overshoot."""
    wpb = {book.book_id: words_per_block(book, settings) for book in books}
    for book in books:
        planned = sum(
            blocks * wpb[book.book_id]
            for (book_id, _day), blocks in result_assignments.items()
            if book_id == book.book_id
        )
        overshoot = wpb[book.book_id] * max(1, book.min_blocks_per_session - 1)
        assert planned <= book.words_total + overshoot


def test_mip_does_not_overread_books_far_past_completion() -> None:
    """Test that mip does not overread books far past completion."""
    books = demo_books()
    settings = demo_settings(end_date=date(2026, 4, 30), w_switch=0.0)
    result = solve_plan(books, settings, planner="mip")
    assert result.status in {"OPTIMAL", "FEASIBLE"}

    assert_no_large_overread(books, result.assignments, settings)


def test_mip_finishes_book_when_last_chunk_is_sub_block() -> None:
    """Test that mip finishes book when last chunk is sub block."""
    books = [demo_books()[0]]
    settings = demo_settings(
        time_quantum_minutes=5, wpm_base=170, end_date=date(2026, 3, 31)
    )
    result = solve_plan(books, settings, planner="mip")
    assert result.status in {"OPTIMAL", "FEASIBLE"}
    wpb = words_per_block(books[0], settings)
    planned = sum(v * wpb for (_bid, _), v in result.assignments.items())
    assert planned >= books[0].words_total


def test_mip_honors_blocker_dependency() -> None:
    """Test that mip honors blocker dependency."""
    books = [
        Book("b1", "First", 7500, 1, 1, None, 1),
        Book("b2", "Second", 3750, 1, 1, None, 1, None, 0.0, None, "b1"),
    ]
    settings = demo_settings(
        start_date=date(2026, 2, 16),
        end_date=date(2026, 2, 20),
        minutes_per_day=30,
        time_quantum_minutes=15,
        max_books_per_day=2,
        max_sessions_per_day=2,
    )
    result = solve_plan(books, settings, planner="mip")
    assert result.status in {"OPTIMAL", "FEASIBLE"}
    b1_days = sorted(
        day
        for (book_id, day), blocks in result.assignments.items()
        if book_id == "b1" and blocks > 0
    )
    b2_days = sorted(
        day
        for (book_id, day), blocks in result.assignments.items()
        if book_id == "b2" and blocks > 0
    )
    assert b1_days
    assert b2_days
    assert min(b2_days) >= max(b1_days)
