"""Test cases for test progress limits."""

from datetime import date
from typing import TYPE_CHECKING, cast

import pytest

from reading_plan.input.builders import book_from_data
from reading_plan.planner_types import WEEKDAYS, Book
from reading_plan.planning.greedy import plan_greedy
from tests.helpers import demo_settings

if TYPE_CHECKING:
    from reading_plan.api_types import BookData


def _book_payload(data: dict[str, object]) -> BookData:
    return cast("BookData", data)


def test_book_builder_accepts_remaining_words_as_canonical_length() -> None:
    """Test that book builder derives total words from remaining words."""
    book = book_from_data(
        _book_payload({
            "book_id": "b1",
            "title": "Demo",
            "remaining_words": 7500,
            "priority": 1,
            "difficulty": 3,
            "progress_percent": 25,
        })
    )
    assert book.words_total == 10000
    assert book.remaining_words == 7500
    assert book.progress_percent == 25


def test_book_builder_scales_pages_read_using_book_page_density() -> None:
    """Test that pages read maps to words via per-book words/page."""
    book = book_from_data(
        _book_payload({
            "book_id": "b-pages",
            "title": "Poetry",
            "words_total": 6000,
            "pages_total": 300,
            "pages_read": 90,
            "priority": 1,
            "difficulty": 3,
        })
    )
    assert book.words_total == 6000
    assert book.remaining_words == 4200
    assert book.progress_percent == 30


def test_greedy_respects_per_book_max_minutes_per_day() -> None:
    """Test that greedy respects per book max minutes per day."""
    books = [Book("b1", "Hard", 30000, 1, 3, None, 1, 30000, 0.0, 15)]
    settings = demo_settings(
        start_date=date(2026, 2, 16),
        end_date=date(2026, 2, 16),
        minutes_per_day=75,
        time_quantum_minutes=5,
    )
    assignments = plan_greedy(books, settings)
    blocks = assignments.get(("b1", settings.start_date), 0)
    assert blocks <= 3


def test_book_builder_defaults_scheduled_days_to_all_weekdays() -> None:
    """Test that book builder defaults scheduled days to every weekday."""
    book = book_from_data(
        _book_payload({
            "book_id": "b-default-days",
            "title": "Demo",
            "remaining_words": 10000,
            "priority": 1,
            "difficulty": 3,
        })
    )
    assert book.scheduled_days == frozenset(WEEKDAYS)


def test_book_builder_rejects_invalid_scheduled_days() -> None:
    """Test that book builder rejects unknown weekday keys."""
    with pytest.raises(ValueError):
        book_from_data(
            _book_payload({
                "book_id": "b-invalid-days",
                "title": "Demo",
                "remaining_words": 10000,
                "priority": 1,
                "difficulty": 3,
                "scheduled_days": ["Mon", "Bad"],
            })
        )


def test_book_builder_coerces_non_string_book_id() -> None:
    """Test that book builder preserves non-string ids via coercion."""
    book = book_from_data(
        _book_payload({"book_id": 42, "title": "Demo", "remaining_words": 10000})
    )
    assert book.book_id == "42"


def test_book_builder_accepts_legacy_blocker_book_id_alias() -> None:
    """Test that book builder still supports blocker_book_id."""
    book = book_from_data(
        _book_payload({
            "book_id": "b1",
            "title": "Demo",
            "remaining_words": 10000,
            "blocker_book_id": 7,
        })
    )
    assert book.blocked_by == "7"


def test_book_builder_rejects_non_positive_words_total() -> None:
    """Test that explicit non-positive words_total values fail fast."""
    with pytest.raises(ValueError):
        book_from_data(
            _book_payload({
                "book_id": "b1",
                "title": "Demo",
                "words_total": 0,
                "pages_total": 100,
            })
        )


def test_book_builder_rejects_non_string_scheduled_day_entries_cleanly() -> (
    None
):
    """Test that scheduled day coercion still surfaces a validation error."""
    with pytest.raises(ValueError):
        book_from_data(
            _book_payload({
                "book_id": "b1",
                "title": "Demo",
                "remaining_words": 10000,
                "scheduled_days": ["Mon", 2],
            })
        )
