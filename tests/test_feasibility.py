"""Test cases for test feasibility."""

from __future__ import annotations

from reading_plan.planning.greedy import plan_greedy
from reading_plan.reporting.report import build_summary
from reading_plan.types import PlanResult
from tests.helpers import demo_books, demo_settings


def test_summary_warns_when_required_exceeds_available() -> None:
    """Test that summary warns when required exceeds available."""
    books = demo_books()
    settings = demo_settings(minutes_per_day=15)
    result = PlanResult("greedy", "FEASIBLE", plan_greedy(books, settings))
    summary = build_summary(books, settings, result)
    assert "exceed" in summary["feasibility_warning"]


def test_summary_contains_book_progress() -> None:
    """Test that summary contains book progress."""
    books = demo_books()
    settings = demo_settings(minutes_per_day=120)
    result = PlanResult("greedy", "FEASIBLE", plan_greedy(books, settings))
    summary = build_summary(books, settings, result)
    assert summary["per_book"]["b1"]["planned_words"] >= 0
    assert summary["total_planned_minutes"] >= 0
