"""Route planning requests through greedy or staged CP-SAT solving."""

import logging
from time import perf_counter
from typing import TYPE_CHECKING

from reading_plan.planner_types import PlanResult
from reading_plan.planning.greedy import plan_greedy
from reading_plan.planning.solve_cp_sat import (
    AttemptContext,
    run_attempt,
)
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
    from collections.abc import Sequence

    from reading_plan.planner_types import Book, Settings
    from reading_plan.planning.model_types import Assignments
    from reading_plan.planning.solve_cp_sat import SolveAttemptResult
    from reading_plan.planning.solve_heuristics import SolveStage


LOGGER = logging.getLogger("reading_plan.bridge")
UNKNOWN_STATUS_NAME = "UNKNOWN"
INFEASIBLE_STATUS_NAME = "INFEASIBLE"
FAST_MODE_NOTE = "Fast mode uses greedy planner."


def solve_plan(
    books: list[Book], settings: Settings, planner: str = "mip"
) -> PlanResult:
    """Route planning to greedy or CP-SAT and return a normalized result."""
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
    """Backward-compatible entrypoint for the staged CP-SAT planner."""
    return _solve_cp_sat(books, settings, profile=profile)


def _solve_cp_sat(
    books: list[Book],
    settings: Settings,
    profile: str = DEFAULT_SOLVER_PROFILE,
) -> PlanResult:
    """Solve with CP-SAT and fall back to greedy after infeasible prechecks."""
    started = perf_counter()
    greedy_assignments = plan_greedy(books, settings)
    precheck_fallback = _fallback_from_precheck(
        books=books,
        settings=settings,
        greedy_assignments=greedy_assignments,
    )
    if precheck_fallback is not None:
        return precheck_fallback
    attempt_context = AttemptContext(
        books=books,
        settings=settings,
        hints=greedy_assignments,
    )
    best_result, last_status = _solve_stages(
        attempt_context,
        stages_for_profile(profile),
        greedy_assignments,
    )
    return _finalize_solve_cp_sat_result(
        best_result,
        last_status,
        greedy_assignments,
        started,
        profile,
    )


def _fallback_from_precheck(
    books: list[Book],
    settings: Settings,
    greedy_assignments: Assignments,
) -> PlanResult | None:
    """Return greedy fallback when precheck detects infeasibility."""
    precheck = run_precheck(books, settings)
    if precheck.is_feasible:
        return None
    LOGGER.debug(
        "solve_cp_sat: precheck marked infeasible; using greedy fallback",
        extra={"note": precheck.note},
    )
    return _fallback_to_greedy(greedy_assignments, precheck.note)


def _solve_stages(
    base_context: AttemptContext,
    stages: Sequence[SolveStage],
    initial_hints: Assignments,
) -> tuple[PlanResult | None, str]:
    """Run staged solve attempts and return best feasible result and status."""
    best_result: PlanResult | None = None
    incumbent_hints = initial_hints
    last_status = UNKNOWN_STATUS_NAME
    for stage in stages:
        attempt_context = _attempt_context_with_hints(
            base_context,
            incumbent_hints,
        )
        attempt = run_attempt(attempt_context, stage)
        _log_stage_result(stage, attempt)
        last_status = attempt.plan.status
        if _should_skip_stage_result(attempt.plan, stage):
            continue
        incumbent_hints, best_result = _accept_feasible_attempt(
            stage,
            attempt,
            incumbent_hints,
            best_result,
        )
        if _is_optimal_result(best_result):
            break
    return best_result, last_status


def _attempt_context_with_hints(
    context: AttemptContext,
    hints: Assignments,
) -> AttemptContext:
    """Clone immutable attempt context with updated incumbent hints."""
    return AttemptContext(
        books=context.books,
        settings=context.settings,
        hints=hints,
    )


def _should_skip_stage_result(plan: PlanResult, stage: SolveStage) -> bool:
    """Return true when stage result should not be accepted."""
    if _is_infeasible_stage(plan):
        LOGGER.debug(
            "solve_cp_sat: infeasible stage encountered",
            extra={"stage": stage.name},
        )
        return True
    return not is_result_feasible(plan)


def _finalize_solve_cp_sat_result(
    best_result: PlanResult | None,
    last_status: str,
    greedy_assignments: Assignments,
    started: float,
    profile: str,
) -> PlanResult:
    """Return best CP-SAT plan or a greedy fallback with explanatory note."""
    if best_result is not None:
        LOGGER.debug(
            "solve_cp_sat: returning best CP-SAT solution",
            extra={
                "status": best_result.status,
                "assignment_count": len(best_result.assignments),
                "total_elapsed_ms": int((perf_counter() - started) * 1000),
                "profile": profile,
            },
        )
        return best_result
    note = (
        f"CP-SAT produced no feasible solution ({last_status}); "
        "fell back to greedy planner."
    )
    return _fallback_to_greedy(greedy_assignments, note)


def _accept_feasible_attempt(
    stage: SolveStage,
    attempt: SolveAttemptResult,
    incumbent_hints: Assignments,
    best_result: PlanResult | None,
) -> tuple[Assignments, PlanResult | None]:
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


def _fallback_to_greedy(
    assignments: Assignments,
    note: str,
) -> PlanResult:
    """Return a greedy fallback plan with a clear reason note."""
    return PlanResult(
        "greedy",
        FEASIBLE_STATUS_NAME,
        assignments,
        note=note,
    )


def _log_stage_result(
    stage: SolveStage, attempt: SolveAttemptResult
) -> None:
    """Emit standardized logs for each staged solver attempt."""
    LOGGER.debug(
        (
            "solve_cp_sat: stage completed stage=%s seed=%s budget_s=%.2f "
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
