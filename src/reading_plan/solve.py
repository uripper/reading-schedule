from __future__ import annotations

from datetime import date

from .greedy import plan_greedy
from .types import Book, PlanResult, Settings


def solve_plan(books: list[Book], settings: Settings, planner: str = "mip") -> PlanResult:
    if planner == "greedy":
        return PlanResult(planner="greedy", status="FEASIBLE", assignments=plan_greedy(books, settings))
    return _solve_mip(books, settings)


def _solve_mip(books: list[Book], settings: Settings) -> PlanResult:
    try:
        from ortools.sat.python import cp_model
        from .model import build_cp_sat
    except ImportError:
        note = "OR-Tools is unavailable; fell back to greedy planner."
        return PlanResult("greedy", "FEASIBLE", plan_greedy(books, settings), note=note)

    model, x, _y, _f, _days = build_cp_sat(books, settings)
    solver = cp_model.CpSolver()
    solver.parameters.random_seed = 7
    solver.parameters.num_search_workers = 1
    solver.parameters.max_time_in_seconds = 20.0
    raw = solver.Solve(model)
    status = _status_name(raw, cp_model)
    if raw not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
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


def _status_name(raw: int, cp_model: object) -> str:
    mapping = {
        cp_model.OPTIMAL: "OPTIMAL",
        cp_model.FEASIBLE: "FEASIBLE",
        cp_model.INFEASIBLE: "INFEASIBLE",
        cp_model.MODEL_INVALID: "MODEL_INVALID",
        cp_model.UNKNOWN: "UNKNOWN",
    }
    return mapping.get(raw, "UNKNOWN")
