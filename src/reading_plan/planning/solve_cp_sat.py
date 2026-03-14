"""Concrete CP-SAT runtime helpers for staged planner solving."""

from dataclasses import dataclass
from time import perf_counter
from typing import TYPE_CHECKING

from reading_plan.planner_types import PlanResult
from reading_plan.planning.cp_sat_runtime import cp_model
from reading_plan.planning.model import BuildModelOptions, build_cp_sat
from reading_plan.planning.solve_heuristics import (
    FEASIBLE_STATUS_NAME,
    OPTIMAL_STATUS_NAME,
)


if TYPE_CHECKING:
    from reading_plan.planner_types import Book, Settings
    from reading_plan.planning.model_types import (
        Assignments,
        BookDayVars,
        BuildCpSatResult,
        CpModelLike,
        CpSolverLike,
    )
    from reading_plan.planning.solve_heuristics import SolveStage

CP_SAT_PLANNER_NAME = "cp-sat"
MODEL_INVALID_STATUS_NAME = "MODEL_INVALID"
INFEASIBLE_STATUS_NAME = "INFEASIBLE"
UNKNOWN_STATUS_NAME = "UNKNOWN"
MILLISECONDS_PER_SECOND = 1000
STATUS_NAME_BY_CODE = {
    int(cp_model.OPTIMAL): OPTIMAL_STATUS_NAME,
    int(cp_model.FEASIBLE): FEASIBLE_STATUS_NAME,
    int(cp_model.INFEASIBLE): INFEASIBLE_STATUS_NAME,
    int(cp_model.MODEL_INVALID): MODEL_INVALID_STATUS_NAME,
    int(cp_model.UNKNOWN): UNKNOWN_STATUS_NAME,
}
FEASIBLE_CP_SAT_STATUSES = frozenset({
    int(cp_model.OPTIMAL),
    int(cp_model.FEASIBLE),
})


@dataclass(frozen=True)
class SolveAttemptResult:
    """Result metadata captured for one CP-SAT attempt."""

    # Planner output captured from this individual solve attempt.
    plan: PlanResult
    # Wall-clock solve time for the attempt in milliseconds.
    elapsed_ms: int


@dataclass(frozen=True)
class AttemptContext:
    """Shared immutable inputs used for each staged CP-SAT attempt."""

    # Normalized books to schedule during the attempt.
    books: list[Book]
    # Planner settings applied to the attempt.
    settings: Settings
    # Optional assignment hints carried forward from earlier stages.
    hints: Assignments


def run_attempt(
    context: AttemptContext,
    stage: SolveStage,
) -> SolveAttemptResult:
    """Execute one staged CP-SAT solve and retry once without hints."""
    first_attempt = _solve_once(context, stage, hint_mode="with_hints")
    if first_attempt.plan.status != MODEL_INVALID_STATUS_NAME:
        return first_attempt
    if not context.hints:
        return first_attempt
    retry_attempt = _solve_once(context, stage, hint_mode="without_hints")
    combined_elapsed = first_attempt.elapsed_ms + retry_attempt.elapsed_ms
    return SolveAttemptResult(
        plan=retry_attempt.plan,
        elapsed_ms=combined_elapsed,
    )


def _objective_mode(stage: SolveStage) -> str:
    """Return the stage objective mode label."""
    if stage.include_objective:
        return "optimize"
    return "feasibility"


def _maybe_add_hints(
    hint_mode: str,
    hints: Assignments,
    model: CpModelLike,
    x_vars: BookDayVars,
) -> None:
    """Apply solver hints only when this attempt allows them."""
    if hint_mode != "with_hints":
        return
    _add_hints(model, x_vars, hints)


def _solver_and_status(
    model: CpModelLike,
    stage: SolveStage,
) -> tuple[CpSolverLike, int]:
    """Solve the model with stage parameters and return raw status."""
    solver = cp_model.CpSolver()
    _apply_solver_parameters(solver, stage)
    return solver, int(solver.Solve(model))


def _solve_once(
    context: AttemptContext,
    stage: SolveStage,
    hint_mode: str,
) -> SolveAttemptResult:
    """Build and solve one CP-SAT model instance for a single stage."""
    started = perf_counter()
    model, x, _y, _finished, _days = _build_model_for_stage(
        context,
        _objective_mode(stage),
        stage.lock_days_from_start,
    )
    _maybe_add_hints(hint_mode, context.hints, model, x)
    solver, raw_status = _solver_and_status(model, stage)
    plan = _result_from_solver(raw_status, solver, x)
    elapsed_ms = int((perf_counter() - started) * MILLISECONDS_PER_SECOND)
    return SolveAttemptResult(plan=plan, elapsed_ms=elapsed_ms)


def _build_model_for_stage(
    context: AttemptContext,
    objective_mode: str,
    lock_days_from_start: int,
) -> BuildCpSatResult:
    """Build one stage-specific CP-SAT model."""
    return build_cp_sat(
        context.books,
        context.settings,
        BuildModelOptions(
            objective_mode=objective_mode,
            lock_days_from_start=lock_days_from_start,
            lock_assignments=context.hints,
        ),
    )


def _add_hints(
    model: CpModelLike,
    x_vars: BookDayVars,
    assignments: Assignments,
) -> None:
    """Feed assignment hints into CP-SAT for faster feasible search."""
    if not assignments:
        return
    for key, value in assignments.items():
        x_var = x_vars.get(key)
        if x_var is None:
            continue
        model.AddHint(x_var, int(value))


def _apply_solver_parameters(
    solver: CpSolverLike,
    stage: SolveStage,
) -> None:
    """Apply deterministic solver settings for one stage."""
    params = solver.parameters
    params.random_seed = stage.seed
    params.num_search_workers = stage.worker_count
    params.cp_model_presolve = stage.cp_model_presolve
    params.stop_after_first_solution = stage.stop_after_first_solution
    params.max_time_in_seconds = stage.max_time_seconds


def _result_from_solver(
    raw_status: int,
    solver: CpSolverLike,
    variables: BookDayVars,
) -> PlanResult:
    """Build planner result from solved model outputs and status code."""
    status = _status_name(raw_status)
    if raw_status not in FEASIBLE_CP_SAT_STATUSES:
        return PlanResult(
            planner=CP_SAT_PLANNER_NAME,
            status=status,
            assignments={},
        )

    assignments = _extract_assignments(solver, variables)
    objective = int(solver.ObjectiveValue())
    return PlanResult(
        planner=CP_SAT_PLANNER_NAME,
        status=status,
        assignments=assignments,
        objective=objective,
    )


def _status_name(raw_status: int) -> str:
    """Map CP-SAT numeric status codes to stable string names."""
    return STATUS_NAME_BY_CODE.get(raw_status, UNKNOWN_STATUS_NAME)


def _extract_assignments(
    solver: CpSolverLike,
    variables: BookDayVars,
) -> Assignments:
    """Extract positive assignment values from solved decision variables."""
    assignments: Assignments = {}
    for key, variable in variables.items():
        value = int(solver.Value(variable))
        if value > 0:
            assignments[key] = value
    return assignments
