"""Runtime loading helpers for OR-Tools CP-SAT."""

from __future__ import annotations

from importlib import import_module
from typing import cast

from reading_plan.planning.model_types import CpModelModuleLike


def load_cp_model_module() -> CpModelModuleLike | None:
    """Load OR-Tools CP-SAT module when available."""
    try:
        module = import_module("ortools.sat.python.cp_model")
    except ImportError:
        return None
    return cast(CpModelModuleLike, module)
