"""Type-only protocols for the OR-Tools CP-SAT runtime."""

from __future__ import annotations

from typing import Protocol


class LinearExprLike(Protocol):
    """Structural type for linear expressions used by the planner."""

    def __add__(self, other: object) -> LinearExprLike:
        """Return the sum of this expression and another value."""
        ...

    def __radd__(self, other: object) -> LinearExprLike:
        """Return the reversed sum of this expression and another value."""
        ...

    def __mul__(self, other: object) -> LinearExprLike:
        """Return this expression scaled by another value."""
        ...

    def __rmul__(self, other: object) -> LinearExprLike:
        """Return the reversed scaled form of this expression."""
        ...

    def __sub__(self, other: object) -> LinearExprLike:
        """Return the difference between this expression and another value."""
        ...

    def __rsub__(self, other: object) -> LinearExprLike:
        """Return the reversed difference for this expression."""
        ...

    def __le__(self, other: object) -> object:
        """Return a less-than-or-equal constraint expression."""
        ...

    def __ge__(self, other: object) -> object:
        """Return a greater-than-or-equal constraint expression."""
        ...


class IntVarLike(LinearExprLike, Protocol):
    """Structural type for CP-SAT integer and boolean decision variables."""


class CpModelLike(Protocol):
    """Structural type for the planner-facing subset of ``CpModel``."""

    def NewIntVar(self, lb: int, ub: int, name: str) -> IntVarLike:  # noqa: N802 - Matches OR-Tools PascalCase API.
        """Create an integer decision variable."""
        ...

    def NewBoolVar(self, name: str) -> IntVarLike:  # noqa: N802 - Matches OR-Tools PascalCase API.
        """Create a boolean decision variable."""
        ...

    def Add(self, constraint: object) -> object:  # noqa: N802 - Matches OR-Tools PascalCase API.
        """Add a constraint to the model."""
        ...

    def AddHint(  # noqa: N802 - Matches OR-Tools PascalCase API.
        self,
        variable: IntVarLike,
        value: int,
    ) -> None:
        """Attach a solver hint to a decision variable."""
        ...

    def Maximize(self, objective: object) -> None:  # noqa: N802 - Matches OR-Tools PascalCase API.
        """Set the maximization objective for the model."""
        ...


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

    def Solve(self, model: CpModelLike) -> int:  # noqa: N802 - Matches OR-Tools PascalCase API.
        """Solve the provided CP-SAT model."""
        ...

    def Value(self, variable: IntVarLike) -> int:  # noqa: N802 - Matches OR-Tools PascalCase API.
        """Return the solved value for one decision variable."""
        ...

    def ObjectiveValue(self) -> float:  # noqa: N802 - Matches OR-Tools PascalCase API.
        """Return the solved objective value."""
        ...


class CpModelModule(Protocol):
    """Structural type for the imported OR-Tools CP-SAT module."""

    CpModel: type[CpModelLike]
    CpSolver: type[CpSolverLike]
    OPTIMAL: int
    FEASIBLE: int
    INFEASIBLE: int
    MODEL_INVALID: int
    UNKNOWN: int
