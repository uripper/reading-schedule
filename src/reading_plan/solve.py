from __future__ import annotations

from datetime import date
from typing import Protocol, SupportsInt

from .greedy import plan_greedy
from .types import Book, PlanResult, Settings


def solve_plan(books: list[Book], settings: Settings, planner: str = "mip") -> PlanResult:
    if planner == "greedy":
        return PlanResult(planner="greedy", status="FEASIBLE", assignments=plan_greedy(books, settings))
    return _solve_mip(books, settings)


class _CpModelStatusModule(Protocol):
    @property
    def OPTIMAL(self) -> SupportsInt: ...

    @property
    def FEASIBLE(self) -> SupportsInt: ...

    @property
    def INFEASIBLE(self) -> SupportsInt: ...

    @property
    def MODEL_INVALID(self) -> SupportsInt: ...

    @property
    def UNKNOWN(self) -> SupportsInt: ...


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
    raw = int(solver.Solve(model))
    status = _status_name(raw, cp_model)
    if raw not in (int(cp_model.OPTIMAL), int(cp_model.FEASIBLE)):
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


def _status_name(raw: int, cp_model: _CpModelStatusModule) -> str:
    mapping = {
        int(cp_model.OPTIMAL): "OPTIMAL",
        int(cp_model.FEASIBLE): "FEASIBLE",
        int(cp_model.INFEASIBLE): "INFEASIBLE",
        int(cp_model.MODEL_INVALID): "MODEL_INVALID",
        int(cp_model.UNKNOWN): "UNKNOWN",
    }
    return mapping.get(raw, "UNKNOWN")
