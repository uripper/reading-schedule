"""Tests for concrete CP-SAT solver helpers."""

from __future__ import annotations

import pytest

pytest.importorskip("ortools")

from ortools.sat.python import cp_model
import reading_plan.planning.solve_cp_sat as solve_cp_sat_module
from reading_plan.planning.solve_heuristics import SolveStage


def test_apply_solver_parameters_keeps_presolve_enabled_by_default() -> None:
    """Stage defaults should keep CP-SAT presolve enabled."""
    solver = cp_model.CpSolver()
    stage = SolveStage("default", 1.0, 7)

    solve_cp_sat_module._apply_solver_parameters(solver, stage)

    assert solver.parameters.cp_model_presolve is True


def test_apply_solver_parameters_supports_disabling_presolve() -> None:
    """Stages should be able to disable CP-SAT presolve explicitly."""
    solver = cp_model.CpSolver()
    stage = SolveStage("no-presolve", 1.0, 7, cp_model_presolve=False)

    solve_cp_sat_module._apply_solver_parameters(solver, stage)

    assert solver.parameters.cp_model_presolve is False
