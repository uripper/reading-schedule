from __future__ import annotations

from reading_plan.budget import words_per_block
from reading_plan.budget import day_capacity_blocks
from reading_plan.calendar import date_range
from reading_plan.greedy import plan_greedy
from reading_plan.schedule import to_schedule_rows
from reading_plan.types import Book
from tests.helpers import demo_books, demo_settings


def test_greedy_respects_daily_constraints():
    books = demo_books()
    settings = demo_settings()
    assignments = plan_greedy(books, settings)
    days = date_range(settings.start_date, settings.end_date)

    for day in days:
        day_blocks = sum(v for (book_id, d), v in assignments.items() if d == day)
        day_books = {book_id for (book_id, d), v in assignments.items() if d == day and v > 0}
        assert day_blocks <= day_capacity_blocks(settings, day)
        assert len(day_books) <= settings.max_books_per_day
        assert len(day_books) <= settings.max_sessions_per_day

    min_blocks = {b.book_id: b.min_blocks_per_session for b in books}
    for (book_id, _day), blocks in assignments.items():
        assert blocks == 0 or blocks >= min_blocks[book_id]


def test_schedule_rows_have_expected_shape():
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


def test_schedule_trims_last_session_to_remaining_words():
    settings = demo_settings(time_quantum_minutes=5, wpm_base=170)
    book = Book("b1", "One", 800, 5, 2, None, 1)
    assignments = {(book.book_id, settings.start_date): 2}
    rows = to_schedule_rows([book], settings, assignments)
    assert len(rows) == 1
    assert rows[0]["words_planned"] == 800
    assert rows[0]["minutes"] < 10
    assert words_per_block(book, settings) > 400
