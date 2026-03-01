"""Utilities for solve."""

from __future__ import annotations

from dataclasses import dataclass
import logging
from time import perf_counter
from typing import TYPE_CHECKING, Any, cast

from reading_plan.planner_types import PlanResult
from reading_plan.planning.cp_sat_runtime import load_cp_model_module
from reading_plan.planning.greedy import plan_greedy
from reading_plan.planning.model import build_cp_sat
from reading_plan.planning.solve_heuristics import (
    DEFAULT_SOLVER_PROFILE,
    FEASIBLE_STATUS_NAME,
    OPTIMAL_STATUS_NAME,
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


LOGGER = logging.getLogger("reading_plan.bridge")
UNKNOWN_STATUS_NAME = "UNKNOWN"
INFEASIBLE_STATUS_NAME = "INFEASIBLE"


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
    LOGGER.debug(
        "solve_plan: entered",
        extra={"book_count": len(books), "planner": planner},
    )
    if planner == "greedy":
        return PlanResult(
            planner="greedy",
            status=FEASIBLE_STATUS_NAME,
            assignments=plan_greedy(books, settings),
        )
    return _solve_mip(books, settings, profile=profile_from_planner(planner))


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
        if is_result_feasible(attempt.plan):
            best_result = better_plan(best_result, attempt.plan)
            incumbent_hints = best_result.assignments
            if best_result.status == OPTIMAL_STATUS_NAME:
                break
            continue

        if attempt.plan.status == INFEASIBLE_STATUS_NAME:
            LOGGER.debug(
                "solve_mip: infeasible stage encountered",
                extra={"stage": stage.name},
            )

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
    cp_model_module = cast("Any", context.cp_model_module)
    model, x, _y, _finished, _days = build_cp_sat(
        context.books,
        context.settings,
        cp_model_module,
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
    solver_any = cast("Any", solver)
    params = solver_any.parameters
    params.random_seed = stage.seed
    params.num_search_workers = 1
    params.cp_model_presolve = True
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
        "solve_mip: stage completed",
        extra={
            "stage": stage.name,
            "seed": stage.seed,
            "max_time_seconds": stage.max_time_seconds,
            "elapsed_ms": attempt.elapsed_ms,
            "status": attempt.plan.status,
            "assignment_count": len(attempt.plan.assignments),
            "objective": attempt.plan.objective,
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
