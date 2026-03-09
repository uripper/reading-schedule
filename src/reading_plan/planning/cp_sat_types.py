"""Type-only protocols for the OR-Tools CP-SAT runtime."""

from __future__ import annotations

from typing import Protocol


class LinearExprLike(Protocol):
    """Structural type for linear expressions used by the planner."""

    def __add__(self, other: object) -> LinearExprLike: ...

    def __radd__(self, other: object) -> LinearExprLike: ...

    def __mul__(self, other: object) -> LinearExprLike: ...

    def __rmul__(self, other: object) -> LinearExprLike: ...

    def __sub__(self, other: object) -> LinearExprLike: ...

    def __rsub__(self, other: object) -> LinearExprLike: ...

    def __le__(self, other: object) -> object: ...

    def __ge__(self, other: object) -> object: ...


class IntVarLike(LinearExprLike, Protocol):
    """Structural type for CP-SAT integer and boolean decision variables."""


class CpModelLike(Protocol):
    """Structural type for the planner-facing subset of ``CpModel``."""

    def NewIntVar(self, lb: int, ub: int, name: str) -> IntVarLike: ...

    def NewBoolVar(self, name: str) -> IntVarLike: ...

    def Add(self, constraint: object) -> object: ...

    def AddHint(self, variable: IntVarLike, value: int) -> None: ...

    def Maximize(self, objective: object) -> None: ... 


class SatParametersLike(Protocol):
    """Structural type for mutable CP-SAT solver parameters."""

    random_seed: int
    num_search_workers: int
    cp_model_presolve: bool
    stop_after_first_solution: bool
    max_time_in_seconds: float


class CpSolverLike(Protocol):
    """Structural type for the planner-facing subset of ``CpSolver``."""

    parameters: SatParametersLike

    def Solve(self, model: CpModelLike) -> int: ...

    def Value(self, variable: IntVarLike) -> int: ...

    def ObjectiveValue(self) -> float: ...


class CpModelModule(Protocol):
    """Structural type for the imported OR-Tools CP-SAT module."""

    CpModel: type[CpModelLike]
    CpSolver: type[CpSolverLike]
    OPTIMAL: int
    FEASIBLE: int
    INFEASIBLE: int
    MODEL_INVALID: int
    UNKNOWN: int
