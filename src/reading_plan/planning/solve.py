"""Utilities for solve."""

from __future__ import annotations

from typing import TYPE_CHECKING, SupportsInt

from reading_plan.planner_types import PlanResult
from reading_plan.planning.greedy import plan_greedy

if TYPE_CHECKING:
    from datetime import date

    from reading_plan.planner_types import Book, Settings


def solve_plan(
    books: list[Book], settings: Settings, planner: str = "mip"
) -> PlanResult:
    """Route planning to greedy or MIP and return a normalized plan result."""
    if planner == "greedy":
        return PlanResult(
            planner="greedy",
            status="FEASIBLE",
            assignments=plan_greedy(books, settings),
        )
    return _solve_mip(books, settings)


def _solve_mip(books: list[Book], settings: Settings) -> PlanResult:
    """Solve with CP-SAT, fall back to greedy when OR-Tools is unavailable."""
    try:
        from ortools.sat.python import cp_model

        from reading_plan.planning.model import build_cp_sat
    except ImportError:
        note = "OR-Tools is unavailable; fell back to greedy planner."
        return PlanResult(
            "greedy", "FEASIBLE", plan_greedy(books, settings), note=note
        )

    model, x, _y, _f, _days = build_cp_sat(books, settings)
    solver = cp_model.CpSolver()
    solver.parameters.random_seed = 7
    solver.parameters.num_search_workers = 1
    solver.parameters.max_time_in_seconds = 20.0
    raw = int(solver.Solve(model))
    status_values = {
        "OPTIMAL": cp_model.OPTIMAL,
        "FEASIBLE": cp_model.FEASIBLE,
        "INFEASIBLE": cp_model.INFEASIBLE,
        "MODEL_INVALID": cp_model.MODEL_INVALID,
        "UNKNOWN": cp_model.UNKNOWN,
    }
    status = _status_name(raw, status_values)
    if raw not in {int(cp_model.OPTIMAL), int(cp_model.FEASIBLE)}:
        return PlanResult(planner="mip", status=status, assignments={})

    assignments: dict[tuple[str, date], int] = {}
    for key, var in x.items():
        value = solver.Value(var)
        if value > 0:
            assignments[key] = value
    return PlanResult(
        planner="mip",
        status=status,
        assignments=assignments,
        objective=int(solver.ObjectiveValue()),
    )


def _status_name(raw: int, status_values: dict[str, SupportsInt]) -> str:
    """Map CP-SAT numeric status codes to stable string names."""
    mapping = {
        int(status_values["OPTIMAL"]): "OPTIMAL",
        int(status_values["FEASIBLE"]): "FEASIBLE",
        int(status_values["INFEASIBLE"]): "INFEASIBLE",
        int(status_values["MODEL_INVALID"]): "MODEL_INVALID",
        int(status_values["UNKNOWN"]): "UNKNOWN",
    }
    return mapping.get(raw, "UNKNOWN")
