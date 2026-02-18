from __future__ import annotations

from datetime import date

from reading_plan.builders import book_from_data
from reading_plan.greedy import plan_greedy
from reading_plan.types import Book
from tests.helpers import demo_settings


def test_book_builder_converts_progress_to_remaining_words():
    book = book_from_data(
        {
            "book_id": "b1",
            "title": "Demo",
            "words_total": 10000,
            "priority": 1,
            "difficulty": 3,
            "progress_percent": 25,
        }
    )
    assert book.words_full == 10000
    assert book.words_total == 7500
    assert book.progress_percent == 25


def test_greedy_respects_per_book_max_minutes_per_day():
    books = [Book("b1", "Hard", 30000, 1, 3, None, 1, 30000, 0.0, 15)]
    settings = demo_settings(start_date=date(2026, 2, 16), end_date=date(2026, 2, 16), minutes_per_day=75, time_quantum_minutes=5)
    assignments = plan_greedy(books, settings)
    blocks = assignments.get(("b1", settings.start_date), 0)
    assert blocks <= 3
