"""Test cases for test schedule."""

from __future__ import annotations

from datetime import date

from reading_plan.calendar import date_range
from reading_plan.planning.budget import day_capacity_blocks, words_per_block
from reading_plan.planning.greedy import plan_greedy
from reading_plan.schedule.schedule import to_schedule_rows
from reading_plan.types import Book
from tests.helpers import demo_books, demo_settings


def test_greedy_respects_daily_constraints() -> None:
    """Test that greedy respects daily constraints."""
    books = demo_books()
    settings = demo_settings()
    assignments = plan_greedy(books, settings)
    days = date_range(settings.start_date, settings.end_date)

    day_totals = {
        day: (
            sum(v for (_book_id, d), v in assignments.items() if d == day),
            {book_id for (book_id, d), v in assignments.items() if d == day and v > 0},
        )
        for day in days
    }
    assert all(day_totals[day][0] <= day_capacity_blocks(settings, day) for day in days)
    assert all(len(day_totals[day][1]) <= settings.max_books_per_day for day in days)
    assert all(len(day_totals[day][1]) <= settings.max_sessions_per_day for day in days)

    min_blocks = {b.book_id: b.min_blocks_per_session for b in books}
    assert all(
        blocks == 0 or blocks >= min_blocks[book_id]
        for (book_id, _day), blocks in assignments.items()
    )


def test_schedule_rows_have_expected_shape() -> None:
    """Test that schedule rows have expected shape."""
    books = demo_books()
    settings = demo_settings()
    rows = to_schedule_rows(books, settings, plan_greedy(books, settings))
    assert rows
    assert set(rows[0].keys()) == {
        "date",
        "session_index",
        "book_id",
        "title",
        "minutes",
        "words_planned",
    }


def test_schedule_trims_last_session_to_remaining_words() -> None:
    """Test that schedule trims last session to remaining words."""
    settings = demo_settings(time_quantum_minutes=5, wpm_base=170)
    book = Book("b1", "One", 800, 5, 2, None, 1)
    assignments = {(book.book_id, settings.start_date): 2}
    rows = to_schedule_rows([book], settings, assignments)
    assert len(rows) == 1
    words_planned = rows[0]["words_planned"]
    minutes = rows[0]["minutes"]
    assert isinstance(words_planned, int)
    assert isinstance(minutes, int)
    assert words_planned == 800
    assert minutes < 10
    assert words_per_block(book, settings) > 400


def test_greedy_honors_blocker_dependency() -> None:
    """Test that greedy honors blocker dependency."""
    settings = demo_settings(
        start_date=date(2026, 2, 16),
        end_date=date(2026, 2, 20),
        minutes_per_day=30,
        time_quantum_minutes=15,
        max_books_per_day=2,
        max_sessions_per_day=2,
    )
    books = [
        Book("b1", "First", 7500, 1, 1, None, 1),
        Book("b2", "Second", 3750, 1, 1, None, 1, None, 0.0, None, "b1"),
    ]
    assignments = plan_greedy(books, settings)
    b1_days = sorted(
        day
        for (book_id, day), blocks in assignments.items()
        if book_id == "b1" and blocks > 0
    )
    b2_days = sorted(
        day
        for (book_id, day), blocks in assignments.items()
        if book_id == "b2" and blocks > 0
    )
    assert b1_days
    assert b2_days
    assert min(b2_days) >= max(b1_days)
