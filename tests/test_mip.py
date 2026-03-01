"""Test cases for test mip."""

from __future__ import annotations

from datetime import date

import pytest

pytest.importorskip("ortools")

from typing import TYPE_CHECKING

from reading_plan.planner_types import Book
from reading_plan.planning.budget import words_per_block
import reading_plan.planning.solve as solve_module
from reading_plan.planning.solve import solve_plan
from reading_plan.reading_calendar import weekday_key
from tests.helpers import demo_books, demo_settings

if TYPE_CHECKING:
    from reading_plan.planner_types import Settings


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


def test_mip_respects_book_scheduled_days() -> None:
    """Test that mip only schedules a book on allowed weekdays."""
    allowed_days = frozenset({"Tue", "Thu"})
    books = [
        Book(
            "b-allowed-days",
            "Allowed Days",
            12000,
            1,
            3,
            None,
            1,
            None,
            0.0,
            None,
            None,
            allowed_days,
        )
    ]
    settings = demo_settings(
        start_date=date(2026, 2, 16),
        end_date=date(2026, 2, 27),
        minutes_per_day=30,
        time_quantum_minutes=15,
    )
    result = solve_plan(books, settings, planner="mip")
    assert result.status in {"OPTIMAL", "FEASIBLE"}

    planned_days = [
        day
        for (book_id, day), blocks in result.assignments.items()
        if book_id == "b-allowed-days" and blocks > 0
    ]
    assert planned_days
    assert all(weekday_key(day) in allowed_days for day in planned_days)


def test_mip_unknown_status_falls_back_to_greedy(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """UNKNOWN CP-SAT status should return a usable greedy fallback plan."""

    class FakeCpSolver:
        """Minimal fake solver returning UNKNOWN."""

        class parameters:  # noqa: D106 - test fake structure
            random_seed = 0
            num_search_workers = 0
            max_time_in_seconds = 0.0

        def Solve(self, _model: object) -> int:  # noqa: N802 - OR-Tools API
            return 4

    class FakeCpModule:
        """Minimal fake CP-SAT module constants and solver constructor."""

        OPTIMAL = 4_000
        FEASIBLE = 3_000
        INFEASIBLE = 2_000
        MODEL_INVALID = 1_000
        UNKNOWN = 4

        CpSolver = FakeCpSolver

    monkeypatch.setattr(
        solve_module, "load_cp_model_module", lambda: FakeCpModule
    )
    monkeypatch.setattr(
        solve_module,
        "build_cp_sat",
        lambda _books, _settings, _cp: (object(), {}, {}, {}, []),
    )
    monkeypatch.setattr(
        solve_module,
        "plan_greedy",
        lambda _books, _settings: {("fallback", date(2026, 1, 1)): 1},
    )

    result = solve_plan(demo_books(), demo_settings(), planner="mip")

    assert result.planner == "greedy"
    assert result.status == "FEASIBLE"
    assert result.assignments
    assert "UNKNOWN" in result.note
