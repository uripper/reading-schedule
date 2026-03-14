"""Runtime import helpers for the OR-Tools CP-SAT module."""

from __future__ import annotations

from typing import TYPE_CHECKING, TypeGuard


MISSING_CP_MODEL_MESSAGE = (
    "OR-Tools CP-SAT is unavailable. Install the project Python "
    "dependencies before running the planner."
)
INVALID_CP_MODEL_MESSAGE = (
    "Imported OR-Tools CP-SAT module is missing required planner symbols."
)

try:
    from ortools.sat.python import cp_model as imported_cp_model
except ModuleNotFoundError as exc:
    raise ModuleNotFoundError(MISSING_CP_MODEL_MESSAGE) from exc

if TYPE_CHECKING:
    from reading_plan.planning.cp_sat_types import CpModelModule


def _is_cp_model_module(value: object) -> TypeGuard[CpModelModule]:
    required_attributes = (
        "CpModel",
        "CpSolver",
        "OPTIMAL",
        "FEASIBLE",
        "INFEASIBLE",
        "MODEL_INVALID",
        "UNKNOWN",
    )
    return all(hasattr(value, name) for name in required_attributes)


def _load_cp_model() -> CpModelModule:
    """Import the real OR-Tools CP-SAT module with an actionable error."""
    module = imported_cp_model
    if _is_cp_model_module(module):
        return module
    raise TypeError(INVALID_CP_MODEL_MESSAGE)


cp_model = _load_cp_model()
