"""Heuristic configuration and prechecks for staged CP-SAT solving."""

from __future__ import annotations

from dataclasses import dataclass
import math
from typing import TYPE_CHECKING

from reading_plan.planning.budget import (
    book_day_block_limit,
    book_is_scheduled_for_day,
    day_capacity_blocks,
    words_per_block,
)
from reading_plan.reading_calendar import date_range

if TYPE_CHECKING:
    from datetime import date

    from reading_plan.planner_types import Book, PlanResult, Settings

FEASIBLE_STATUS_NAME = "FEASIBLE"
OPTIMAL_STATUS_NAME = "OPTIMAL"
DEFAULT_SOLVER_PROFILE = "balanced"
PROFILE_FAST = "fast"
PROFILE_BALANCED = "balanced"
PROFILE_THOROUGH = "thorough"
DEFAULT_SEED = 7


@dataclass(frozen=True)
class SolveStage:
    """Configuration for one deterministic CP-SAT attempt."""

    name: str
    max_time_seconds: float
    seed: int


@dataclass(frozen=True)
class PrecheckResult:
    """Outcome from cheap infeasibility checks before CP-SAT."""

    is_feasible: bool
    note: str = ""


def stages_for_profile(profile: str) -> tuple[SolveStage, ...]:
    """Return deterministic stage sequence for a solver profile."""
    if profile == PROFILE_FAST:
        return (
            SolveStage("fast-first-feasible", 4.0, DEFAULT_SEED),
            SolveStage("fast-improve", 6.0, DEFAULT_SEED),
        )
    if profile == PROFILE_THOROUGH:
        return (
            SolveStage("thorough-first-feasible", 8.0, DEFAULT_SEED),
            SolveStage("thorough-improve", 16.0, DEFAULT_SEED),
            SolveStage("thorough-seed-11", 16.0, 11),
            SolveStage("thorough-seed-19", 16.0, 19),
        )
    return (
        SolveStage("balanced-first-feasible", 6.0, DEFAULT_SEED),
        SolveStage("balanced-improve", 10.0, DEFAULT_SEED),
        SolveStage("balanced-seed-11", 8.0, 11),
    )


def profile_from_planner(planner: str) -> str:
    """Parse profile suffix while preserving planner token compatibility."""
    token = planner.strip().lower()
    if token in {"mip", "", "default"}:
        return DEFAULT_SOLVER_PROFILE
    profile_aliases = {
        "mip-fast": PROFILE_FAST,
        "mip-balanced": PROFILE_BALANCED,
        "mip-thorough": PROFILE_THOROUGH,
        PROFILE_FAST: PROFILE_FAST,
        PROFILE_BALANCED: PROFILE_BALANCED,
        PROFILE_THOROUGH: PROFILE_THOROUGH,
    }
    return profile_aliases.get(token, DEFAULT_SOLVER_PROFILE)


def run_precheck(books: list[Book], settings: Settings) -> PrecheckResult:
    """Run cheap infeasibility checks before invoking CP-SAT."""
    days = date_range(settings.start_date, settings.end_date)
    caps = {day: day_capacity_blocks(settings, day) for day in days}
    wpb = {book.book_id: words_per_block(book, settings) for book in books}
    total_capacity = sum(caps.values())
    required_capacity = sum(
        required_blocks(book.words_total, wpb[book.book_id]) for book in books
    )
    if required_capacity > total_capacity:
        note = (
            "Precheck infeasible: required blocks exceed total capacity; "
            "fell back to greedy planner."
        )
        return PrecheckResult(is_feasible=False, note=note)
    return _deadline_precheck(books, settings, days, caps, wpb)


def _deadline_precheck(
    books: list[Book],
    settings: Settings,
    days: list[date],
    caps: dict[date, int],
    wpb: dict[str, int],
) -> PrecheckResult:
    """Check whether each deadline book can fit by capacity upper bounds."""
    for book in books:
        if book.deadline is None:
            continue
        required = required_blocks(book.words_total, wpb[book.book_id])
        per_book_limit = book_day_block_limit(book, settings)
        available = 0
        for day in days:
            if day > book.deadline:
                continue
            if not book_is_scheduled_for_day(book, day):
                continue
            available += min(caps[day], per_book_limit)
        if available >= required:
            continue
        note = (
            "Precheck infeasible for deadline-bound book "
            f"{book.book_id}; fell back to greedy planner."
        )
        return PrecheckResult(is_feasible=False, note=note)
    return PrecheckResult(is_feasible=True)


def required_blocks(words_total: int, words_per_block_value: int) -> int:
    """Compute minimum number of blocks needed to cover total words."""
    if words_per_block_value <= 0:
        return 0
    return math.ceil(words_total / words_per_block_value)


def better_plan(
    current: PlanResult | None,
    candidate: PlanResult,
) -> PlanResult:
    """Return the plan with stronger status/objective preference."""
    if current is None or candidate.status == OPTIMAL_STATUS_NAME:
        return candidate
    if current.status == OPTIMAL_STATUS_NAME or candidate.objective is None:
        return current
    if current.objective is None or candidate.objective > current.objective:
        return candidate
    return current


def is_result_feasible(plan: PlanResult) -> bool:
    """Return true when a solved result contains a feasible CP-SAT status."""
    return plan.status in {FEASIBLE_STATUS_NAME, OPTIMAL_STATUS_NAME}
