"""Utilities for solve."""

from __future__ import annotations

from typing import TYPE_CHECKING

from reading_plan.planner_types import PlanResult
from reading_plan.planning.greedy import plan_greedy

try:
    from ortools.sat.python import cp_model

    from reading_plan.planning.model import build_cp_sat
except ImportError:
    cp_model = None
    build_cp_sat = None

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
    if cp_model is None or build_cp_sat is None:
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
    status_values: dict[str, int] = {
        "OPTIMAL": int(cp_model.OPTIMAL),
        "FEASIBLE": int(cp_model.FEASIBLE),
        "INFEASIBLE": int(cp_model.INFEASIBLE),
        "MODEL_INVALID": int(cp_model.MODEL_INVALID),
        "UNKNOWN": int(cp_model.UNKNOWN),
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


def _status_name(raw: int, status_values: dict[str, int]) -> str:
    """Map CP-SAT numeric status codes to stable string names."""
    mapping = {
        status_values["OPTIMAL"]: "OPTIMAL",
        status_values["FEASIBLE"]: "FEASIBLE",
        status_values["INFEASIBLE"]: "INFEASIBLE",
        status_values["MODEL_INVALID"]: "MODEL_INVALID",
        status_values["UNKNOWN"]: "UNKNOWN",
    }
    return mapping.get(raw, "UNKNOWN")
