"""Runtime import helpers for the OR-Tools CP-SAT module."""

from __future__ import annotations

from typing import TYPE_CHECKING, TypeGuard


MISSING_CP_MODEL_MESSAGE = (
    "OR-Tools CP-SAT is unavailable. Install the project Python "
    + "dependencies before running the planner."
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
    """Check whether a runtime import looks like the CP-SAT module we expect.

    Returns:
        `True` when the import exposes every planner symbol required by this
        module.
    """
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
    """Return the validated CP-SAT module used by the staged solver.

    Returns:
        The imported CP-SAT module after symbol validation succeeds.

    Raises:
        TypeError: If the imported module is missing required planner symbols.
    """
    module = imported_cp_model
    if _is_cp_model_module(module):
        return module
    raise TypeError(INVALID_CP_MODEL_MESSAGE)


cp_model = _load_cp_model()
