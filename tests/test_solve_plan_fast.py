"""Tests for solve-plan routing in fast mode."""

from datetime import date
from typing import TYPE_CHECKING

import reading_plan.planning.solve as solve_module
from reading_plan.planning.solve import solve_plan
from tests.helpers import demo_books, demo_settings

if TYPE_CHECKING:
    import pytest


def test_mip_fast_routes_directly_to_greedy(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """mip-fast should bypass CP-SAT and return greedy assignments."""

    def fail_if_mip_called(*_args: object, **_kwargs: object) -> None:
        msg = "_solve_mip should not run for mip-fast"
        raise AssertionError(msg)

    expected = {("fast-book", date(2026, 1, 3)): 2}
    monkeypatch.setattr(solve_module, "_solve_mip", fail_if_mip_called)
    monkeypatch.setattr(
        solve_module,
        "plan_greedy",
        lambda _books, _settings: expected,
    )

    result = solve_plan(demo_books(), demo_settings(), planner="mip-fast")

    assert result.planner == "greedy"
    assert result.status == "FEASIBLE"
    assert result.assignments == expected
    assert "Fast mode uses greedy planner." in result.note


def test_fast_alias_routes_directly_to_greedy(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Fast alias should also bypass CP-SAT and return greedy assignments."""

    def fail_if_mip_called(*_args: object, **_kwargs: object) -> None:
        msg = "_solve_mip should not run for fast alias"
        raise AssertionError(msg)

    expected = {("fast-book", date(2026, 1, 4)): 1}
    monkeypatch.setattr(solve_module, "_solve_mip", fail_if_mip_called)
    monkeypatch.setattr(
        solve_module,
        "plan_greedy",
        lambda _books, _settings: expected,
    )

    result = solve_plan(demo_books(), demo_settings(), planner="fast")

    assert result.planner == "greedy"
    assert result.status == "FEASIBLE"
    assert result.assignments == expected
    assert "Fast mode uses greedy planner." in result.note
