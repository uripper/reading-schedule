"""Shared model typing helpers."""

from __future__ import annotations

from datetime import date
from typing import Any, Protocol, TypeAlias


IntVarLike: TypeAlias = Any
LinearExprLike: TypeAlias = Any
ConstraintLike: TypeAlias = Any


class CpModelLike(Protocol):
    """Subset of the OR-Tools CP-SAT model API used by the planner."""

    def new_int_var(self, lb: int, ub: int, name: str) -> IntVarLike:
        """Create an integer variable."""

    def new_bool_var(self, name: str) -> IntVarLike:
        """Create a boolean variable."""

    def add(self, expression: object) -> ConstraintLike:
        """Add a model constraint."""

    def maximize(self, expression: object) -> None:
        """Set the objective to maximize."""


class CpSolverParametersLike(Protocol):
    """CP-SAT solver parameters used by this project."""

    random_seed: int
    num_search_workers: int
    max_time_in_seconds: float


class CpSolverLike(Protocol):
    """Subset of the OR-Tools solver API used by the planner."""

    parameters: CpSolverParametersLike

    def Solve(self, model: CpModelLike) -> int:
        """Solve a CP-SAT model."""

    def Value(self, variable: IntVarLike) -> int:
        """Return variable value from solved model."""

    def ObjectiveValue(self) -> float:
        """Return solved objective value."""


class CpModelModuleLike(Protocol):
    """Subset of the OR-Tools `cp_model` module used by the planner."""

    OPTIMAL: int
    FEASIBLE: int
    INFEASIBLE: int
    MODEL_INVALID: int
    UNKNOWN: int

    def CpModel(self) -> CpModelLike:
        """Create a CP-SAT model."""

    def CpSolver(self) -> CpSolverLike:
        """Create a CP-SAT solver."""


BookDayVars = dict[tuple[str, date], IntVarLike]
FinishedVars = dict[str, IntVarLike]
BuildCpSatResult = tuple[
    CpModelLike, BookDayVars, BookDayVars, FinishedVars, list[date]
]
