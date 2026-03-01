"""Tests for solver heuristics and profile parsing."""

from __future__ import annotations

from datetime import date

from reading_plan.planner_types import Book
from reading_plan.planning.solve_heuristics import (
    DEFAULT_SOLVER_PROFILE,
    PROFILE_FAST,
    PROFILE_THOROUGH,
    profile_from_planner,
    run_precheck,
)
from tests.helpers import demo_settings


def test_profile_from_planner_supports_profile_aliases() -> None:
    """Planner profile aliases should map to deterministic preset tokens."""
    assert profile_from_planner("mip") == DEFAULT_SOLVER_PROFILE
    assert profile_from_planner("mip-fast") == PROFILE_FAST
    assert profile_from_planner("mip-thorough") == PROFILE_THOROUGH
    assert profile_from_planner("unknown-token") == DEFAULT_SOLVER_PROFILE


def test_precheck_detects_total_capacity_infeasibility() -> None:
    """Precheck should fail quickly when required blocks exceed capacity."""
    books = [
        Book(
            "too-large",
            "Too Large",
            100_000_000,
            1,
            1,
            None,
            1,
        )
    ]
    settings = demo_settings(
        start_date=date(2026, 2, 16),
        end_date=date(2026, 2, 16),
        minutes_per_day=15,
        time_quantum_minutes=15,
        max_books_per_day=1,
        max_sessions_per_day=1,
    )

    precheck = run_precheck(books, settings)

    assert not precheck.is_feasible
    assert "required blocks exceed total capacity" in precheck.note


def test_precheck_detects_deadline_infeasibility() -> None:
    """Precheck should fail when a deadline book cannot fit by upper bounds."""
    books = [
        Book(
            "deadline-tight",
            "Deadline Tight",
            30_000,
            1,
            1,
            date(2026, 2, 16),
            1,
        )
    ]
    settings = demo_settings(
        start_date=date(2026, 2, 16),
        end_date=date(2026, 2, 20),
        minutes_per_day=60,
        time_quantum_minutes=15,
        max_books_per_day=1,
        max_sessions_per_day=1,
    )

    precheck = run_precheck(books, settings)

    assert not precheck.is_feasible
    assert "deadline-bound book" in precheck.note
