"""Utilities for solve."""

from __future__ import annotations

from typing import TYPE_CHECKING

from reading_plan.planner_types import PlanResult
from reading_plan.planning.cp_sat_runtime import load_cp_model_module
from reading_plan.planning.greedy import plan_greedy
from reading_plan.planning.model import build_cp_sat

if TYPE_CHECKING:
    from datetime import date

    from reading_plan.planner_types import Book, Settings
    from reading_plan.planning.model_types import BookDayVars


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
    cp_model_module = load_cp_model_module()
    if cp_model_module is None:
        return _fallback_to_greedy(books, settings)

    model, x, _y, _f, _days = build_cp_sat(
        books, settings, cp_model_module
    )
    solver = cp_model_module.CpSolver()
    solver.parameters.random_seed = 7
    solver.parameters.num_search_workers = 1
    solver.parameters.max_time_in_seconds = 20.0
    raw = int(solver.Solve(model))
    return _result_from_solver(raw, cp_model_module, solver, x)


def _result_from_solver(
    raw: int,
    cp_model_module: object,
    solver: object,
    variables: BookDayVars,
) -> PlanResult:
    """Build planner result from solved model outputs and status codes."""
    status_values = _status_values(cp_model_module)
    status = _status_name(raw, status_values)
    if not _is_feasible(raw, status_values):
        return PlanResult(planner="mip", status=status, assignments={})

    assignments = _extract_assignments(solver, variables)
    objective_name = "ObjectiveValue"
    objective_fn = getattr(solver, objective_name)
    return PlanResult(
        planner="mip",
        status=status,
        assignments=assignments,
        objective=int(objective_fn()),
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


def _fallback_to_greedy(books: list[Book], settings: Settings) -> PlanResult:
    """Return a greedy fallback plan when CP-SAT is unavailable."""
    note = "OR-Tools is unavailable; fell back to greedy planner."
    return PlanResult(
        "greedy",
        "FEASIBLE",
        plan_greedy(books, settings),
        note=note,
    )


def _status_values(cp_model_module: object) -> dict[str, int]:
    """Read CP-SAT status constants from the loaded module."""
    status_values: dict[str, int] = {
        name: int(getattr(cp_model_module, name)) for name in _status_names()
    }
    return status_values


def _is_feasible(raw: int, status_values: dict[str, int]) -> bool:
    """Check whether solver status indicates a feasible solution."""
    return raw in {status_values["OPTIMAL"], status_values["FEASIBLE"]}


def _extract_assignments(
    solver: object,
    variables: BookDayVars,
) -> dict[tuple[str, date], int]:
    """Extract positive assignment values from solved decision variables."""
    value_name = "Value"
    value_fn = getattr(solver, value_name)
    assignments: dict[tuple[str, date], int] = {}
    for key, variable in variables.items():
        value = int(value_fn(variable))
        if value > 0:
            assignments[key] = value
    return assignments


def _status_names() -> tuple[str, str, str, str, str]:
    """Return known CP-SAT status constant names."""
    return (
        "OPTIMAL",
        "FEASIBLE",
        "INFEASIBLE",
        "MODEL_INVALID",
        "UNKNOWN",
    )
