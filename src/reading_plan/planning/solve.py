"""Utilities for solve."""

from __future__ import annotations

from dataclasses import dataclass
import logging
from time import perf_counter
from typing import TYPE_CHECKING, Protocol, cast

from reading_plan.planner_types import PlanResult
from reading_plan.planning.cp_sat_runtime import load_cp_model_module
from reading_plan.planning.greedy import plan_greedy
from reading_plan.planning.model import BuildModelOptions, build_cp_sat
from reading_plan.planning.solve_heuristics import (
    DEFAULT_SOLVER_PROFILE,
    FEASIBLE_STATUS_NAME,
    OPTIMAL_STATUS_NAME,
    PROFILE_FAST,
    better_plan,
    is_result_feasible,
    profile_from_planner,
    run_precheck,
    stages_for_profile,
)

if TYPE_CHECKING:
    from datetime import date

    from reading_plan.planner_types import Book, Settings
    from reading_plan.planning.model_types import BookDayVars
    from reading_plan.planning.solve_heuristics import SolveStage


class SolverParameters(Protocol):
    """Subset of CP-SAT parameters used by planner solve stages."""

    random_seed: int
    num_search_workers: int
    cp_model_presolve: bool
    stop_after_first_solution: bool
    max_time_in_seconds: float


class CpSolverLike(Protocol):
    """Subset of CP-SAT solver API used by planner solve flow."""

    parameters: SolverParameters

    def Solve(self, model: object) -> int:  # noqa: N802 - OR-Tools API
        """Solve one CP-SAT model and return raw status code."""


class CpModuleLike(Protocol):
    """Subset of CP-SAT module API used by planner solve flow."""

    def CpSolver(self) -> CpSolverLike:  # noqa: N802 - OR-Tools API
        """Construct a CP-SAT solver instance."""


LOGGER = logging.getLogger("reading_plan.bridge")
UNKNOWN_STATUS_NAME = "UNKNOWN"
INFEASIBLE_STATUS_NAME = "INFEASIBLE"
FAST_MODE_NOTE = "Fast mode uses greedy planner."


@dataclass(frozen=True)
class SolveAttemptResult:
    """Result metadata captured for one CP-SAT attempt."""

    plan: PlanResult
    elapsed_ms: int


@dataclass(frozen=True)
class AttemptContext:
    """Shared immutable inputs used for each staged CP-SAT attempt."""

    books: list[Book]
    settings: Settings
    cp_model_module: object
    hints: dict[tuple[str, date], int]


def solve_plan(
    books: list[Book], settings: Settings, planner: str = "mip"
) -> PlanResult:
    """Route planning to greedy or MIP and return a normalized plan result."""
    planner_name = planner.strip().lower()
    profile = profile_from_planner(planner_name)
    log_context = {
        "book_count": len(books),
        "planner": planner,
        "profile": profile,
    }
    LOGGER.debug(
        "solve_plan: entered",
        extra=log_context,
    )
    if planner_name == "greedy":
        return PlanResult(
            planner="greedy",
            status=FEASIBLE_STATUS_NAME,
            assignments=plan_greedy(books, settings),
        )
    if profile == PROFILE_FAST:
        return PlanResult(
            planner="greedy",
            status=FEASIBLE_STATUS_NAME,
            assignments=plan_greedy(books, settings),
            note=FAST_MODE_NOTE,
        )
    return _solve_mip(books, settings, profile=profile)


def _solve_mip(
    books: list[Book],
    settings: Settings,
    profile: str = DEFAULT_SOLVER_PROFILE,
) -> PlanResult:
    """Solve with CP-SAT, fall back to greedy when OR-Tools is unavailable."""
    started = perf_counter()
    LOGGER.debug("solve_mip: loading cp-sat module")
    cp_model_module = load_cp_model_module()
    greedy_assignments = plan_greedy(books, settings)
    if cp_model_module is None:
        LOGGER.debug(
            "solve_mip: cp-sat module unavailable; using greedy fallback"
        )
        return _fallback_to_greedy(
            greedy_assignments,
            "OR-Tools is unavailable; fell back to greedy planner.",
        )

    precheck = run_precheck(books, settings)
    if not precheck.is_feasible:
        LOGGER.debug(
            "solve_mip: precheck marked infeasible; using greedy fallback",
            extra={"note": precheck.note},
        )
        return _fallback_to_greedy(greedy_assignments, precheck.note)

    stages = stages_for_profile(profile)
    best_result: PlanResult | None = None
    incumbent_hints = greedy_assignments
    last_status = UNKNOWN_STATUS_NAME
    attempt_context = AttemptContext(
        books=books,
        settings=settings,
        cp_model_module=cp_model_module,
        hints=incumbent_hints,
    )
    for stage in stages:
        attempt_context = AttemptContext(
            books=attempt_context.books,
            settings=attempt_context.settings,
            cp_model_module=attempt_context.cp_model_module,
            hints=incumbent_hints,
        )
        attempt = _run_attempt(attempt_context, stage)
        _log_stage_result(stage, attempt)
        last_status = attempt.plan.status
        if _is_infeasible_stage(attempt.plan):
            LOGGER.debug(
                "solve_mip: infeasible stage encountered",
                extra={"stage": stage.name},
            )
            continue
        if not is_result_feasible(attempt.plan):
            continue
        incumbent_hints, best_result = _accept_feasible_attempt(
            stage,
            attempt,
            incumbent_hints,
            best_result,
        )
        if _is_optimal_result(best_result):
            break

    if best_result is not None:
        LOGGER.debug(
            "solve_mip: returning best cp-sat solution",
            extra={
                "status": best_result.status,
                "assignment_count": len(best_result.assignments),
                "total_elapsed_ms": int((perf_counter() - started) * 1000),
                "profile": profile,
            },
        )
        return best_result

    note = (
        f"MIP produced no feasible solution ({last_status}); "
        "fell back to greedy planner."
    )
    return _fallback_to_greedy(greedy_assignments, note)


def _run_attempt(
    context: AttemptContext,
    stage: SolveStage,
) -> SolveAttemptResult:
    """Execute one staged CP-SAT solve attempt with deterministic params."""
    first_attempt = _solve_once(context, stage, hint_mode="with_hints")
    if first_attempt.plan.status != "MODEL_INVALID":
        return first_attempt
    if not context.hints:
        return first_attempt
    retry_attempt = _solve_once(context, stage, hint_mode="without_hints")
    combined_elapsed = first_attempt.elapsed_ms + retry_attempt.elapsed_ms
    return SolveAttemptResult(
        plan=retry_attempt.plan,
        elapsed_ms=combined_elapsed,
    )


def _solve_once(
    context: AttemptContext,
    stage: SolveStage,
    hint_mode: str,
) -> SolveAttemptResult:
    """Build and solve one CP-SAT model instance for a single stage."""
    started = perf_counter()
    cp_model_module = cast("CpModuleLike", context.cp_model_module)
    objective_mode = "optimize" if stage.include_objective else "feasibility"
    model, x, _y, _finished, _days = _build_model_for_stage(
        context,
        cp_model_module,
        objective_mode,
        stage.lock_days_from_start,
    )
    if hint_mode == "with_hints":
        _add_hints(model, x, context.hints)
    solver = cp_model_module.CpSolver()
    _apply_solver_parameters(solver, stage)
    raw = int(solver.Solve(model))
    plan = _result_from_solver(raw, cp_model_module, solver, x)
    return SolveAttemptResult(
        plan=plan,
        elapsed_ms=int((perf_counter() - started) * 1000),
    )


def _build_model_for_stage(
    context: AttemptContext,
    cp_model_module: CpModuleLike,
    objective_mode: str,
    lock_days_from_start: int,
) -> tuple[object, BookDayVars, object, object, list[date]]:
    """Build model with objective mode, tolerating legacy call signatures."""
    try:
        return build_cp_sat(
            context.books,
            context.settings,
            cp_model_module,
            BuildModelOptions(
                objective_mode=objective_mode,
                lock_days_from_start=lock_days_from_start,
                lock_assignments=context.hints,
            ),
        )
    except TypeError:
        return build_cp_sat(context.books, context.settings, cp_model_module)


def _accept_feasible_attempt(
    stage: SolveStage,
    attempt: SolveAttemptResult,
    incumbent_hints: dict[tuple[str, date], int],
    best_result: PlanResult | None,
) -> tuple[dict[tuple[str, date], int], PlanResult | None]:
    """Update hints and best result after a feasible stage solve."""
    if attempt.plan.assignments:
        incumbent_hints = attempt.plan.assignments
    if stage.include_objective or attempt.plan.assignments:
        best_result = better_plan(best_result, attempt.plan)
    return incumbent_hints, best_result


def _is_infeasible_stage(plan: PlanResult) -> bool:
    """Return true when a stage reports INFEASIBLE."""
    return plan.status == INFEASIBLE_STATUS_NAME


def _is_optimal_result(plan: PlanResult | None) -> bool:
    """Return true when an accepted stage result is optimal."""
    return plan is not None and plan.status == OPTIMAL_STATUS_NAME


def _add_hints(
    model: object,
    x_vars: BookDayVars,
    assignments: dict[tuple[str, date], int],
) -> None:
    """Feed assignment hints into CP-SAT for faster first-feasible search."""
    if not assignments:
        return
    add_hint_fn = getattr(model, "AddHint", None)
    if add_hint_fn is None:
        add_hint_fn = getattr(model, "add_hint", None)
    if add_hint_fn is None:
        return
    for key, value in assignments.items():
        x_var = x_vars.get(key)
        if x_var is None:
            continue
        add_hint_fn(x_var, int(value))


def _apply_solver_parameters(solver: object, stage: SolveStage) -> None:
    """Apply deterministic solver settings for one stage."""
    solver_typed = cast("CpSolverLike", solver)
    params = solver_typed.parameters
    params.random_seed = stage.seed
    params.num_search_workers = stage.worker_count
    params.cp_model_presolve = True
    params.stop_after_first_solution = stage.stop_after_first_solution
    params.max_time_in_seconds = stage.max_time_seconds


def _result_from_solver(
    raw: int,
    cp_model_module: object,
    solver: object,
    variables: BookDayVars,
) -> PlanResult:
    """Build planner result from solved model outputs and status codes."""
    status_values = _status_values(cp_model_module)
    status = _status_name(raw, status_values)
    if not _is_feasible(raw, status_values):
        return PlanResult(planner="mip", status=status, assignments={})

    assignments = _extract_assignments(solver, variables)
    objective_name = "ObjectiveValue"
    objective_fn = getattr(solver, objective_name)
    return PlanResult(
        planner="mip",
        status=status,
        assignments=assignments,
        objective=int(objective_fn()),
    )


def _status_name(raw: int, status_values: dict[str, int]) -> str:
    """Map CP-SAT numeric status codes to stable string names."""
    mapping = {
        status_values["OPTIMAL"]: "OPTIMAL",
        status_values["FEASIBLE"]: "FEASIBLE",
        status_values["INFEASIBLE"]: "INFEASIBLE",
        status_values["MODEL_INVALID"]: "MODEL_INVALID",
        status_values["UNKNOWN"]: "UNKNOWN",
    }
    return mapping.get(raw, "UNKNOWN")


def _fallback_to_greedy(
    assignments: dict[tuple[str, date], int],
    note: str,
) -> PlanResult:
    """Return a greedy fallback plan with a clear reason note."""
    return PlanResult(
        "greedy",
        FEASIBLE_STATUS_NAME,
        assignments,
        note=note,
    )


def _log_stage_result(stage: SolveStage, attempt: SolveAttemptResult) -> None:
    """Emit standardized logs for each staged solver attempt."""
    LOGGER.debug(
        (
            "solve_mip: stage completed stage=%s seed=%s budget_s=%.1f "
            "elapsed_ms=%s status=%s assignments=%s objective=%s lock_days=%s"
        ),
        stage.name,
        stage.seed,
        stage.max_time_seconds,
        attempt.elapsed_ms,
        attempt.plan.status,
        len(attempt.plan.assignments),
        attempt.plan.objective,
        stage.lock_days_from_start,
        extra={
            "stage": stage.name,
            "seed": stage.seed,
            "max_time_seconds": stage.max_time_seconds,
            "elapsed_ms": attempt.elapsed_ms,
            "status": attempt.plan.status,
            "assignment_count": len(attempt.plan.assignments),
            "objective": attempt.plan.objective,
            "lock_days_from_start": stage.lock_days_from_start,
        },
    )


def _status_values(cp_model_module: object) -> dict[str, int]:
    """Read CP-SAT status constants from the loaded module."""
    status_values: dict[str, int] = {
        name: int(getattr(cp_model_module, name)) for name in _status_names()
    }
    return status_values


def _is_feasible(raw: int, status_values: dict[str, int]) -> bool:
    """Check whether solver status indicates a feasible solution."""
    return raw in {status_values["OPTIMAL"], status_values["FEASIBLE"]}


def _extract_assignments(
    solver: object,
    variables: BookDayVars,
) -> dict[tuple[str, date], int]:
    """Extract positive assignment values from solved decision variables."""
    value_name = "Value"
    value_fn = getattr(solver, value_name)
    assignments: dict[tuple[str, date], int] = {}
    for key, variable in variables.items():
        value = int(value_fn(variable))
        if value > 0:
            assignments[key] = value
    return assignments


def _status_names() -> tuple[str, str, str, str, str]:
    """Return known CP-SAT status constant names."""
    return (
        "OPTIMAL",
        "FEASIBLE",
        "INFEASIBLE",
        "MODEL_INVALID",
        "UNKNOWN",
    )
