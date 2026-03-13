"""Runtime import helpers for the OR-Tools CP-SAT module."""

from importlib import import_module
from typing import TYPE_CHECKING, cast


if TYPE_CHECKING:
    from reading_plan.planning.cp_sat_types import CpModelModule

CP_MODEL_MODULE_NAME = "ortools.sat.python.cp_model"
MISSING_CP_MODEL_MESSAGE = (
    "OR-Tools CP-SAT is unavailable. Install the project Python "
    "dependencies before running the planner."
)


def _load_cp_model() -> CpModelModule:
    """Import the real OR-Tools CP-SAT module with an actionable error."""
    try:
        return cast("CpModelModule", import_module(CP_MODEL_MODULE_NAME))
    except ModuleNotFoundError as exc:
        raise ModuleNotFoundError(MISSING_CP_MODEL_MESSAGE) from exc


cp_model = _load_cp_model()
