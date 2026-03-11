"""Build the CP-SAT model, constraints, and objective for one solve run."""

from dataclasses import dataclass
import logging
from typing import TYPE_CHECKING

from reading_plan.planning.cp_sat_runtime import cp_model
from reading_plan.planning.model_objective import (
    ObjectiveContext,
    build_objective_terms,
)
from reading_plan.planning.model_steps import (
    add_day_constraints,
    add_dependency_constraints,
    add_near_term_lock_constraints,
    add_progress_constraints,
    create_model_context,
)

if TYPE_CHECKING:
    from datetime import date

    from reading_plan.planner_types import Book, Settings
    from reading_plan.planning.model_types import BuildCpSatResult


LOGGER = logging.getLogger("reading_plan.bridge")


@dataclass(frozen=True)
class BuildModelOptions:
    """Optional knobs for stage-specific model construction."""

    # Whether to optimize the full objective or build a feasibility model.
    objective_mode: str = "optimize"
    # Number of early planning days to pin to known assignments.
    lock_days_from_start: int = 0
    # Optional fixed assignments used when near-term days are locked.
    lock_assignments: dict[tuple[str, "date"], int] | None = None


def build_cp_sat(
    books: list["Book"],
    settings: "Settings",
    options: BuildModelOptions | None = None,
) -> "BuildCpSatResult":
    """Build a stage-specific CP-SAT model and decision variables."""
    build_options = options or BuildModelOptions()
    LOGGER.debug("build_cp_sat: started", extra={"book_count": len(books)})

    model = cp_model.CpModel()
    context = create_model_context(model, books, settings)
    LOGGER.debug(
        "build_cp_sat: base calendar and budgets built",
        extra={"day_count": len(context.days)},
    )
    LOGGER.debug(
        "build_cp_sat: decision variables created",
        extra={"variable_count": len(context.x)},
    )

    add_day_constraints(context)
    LOGGER.debug("build_cp_sat: day constraints added")

    add_dependency_constraints(context)
    LOGGER.debug("build_cp_sat: dependency constraints added")

    add_near_term_lock_constraints(
        context,
        build_options.lock_days_from_start,
        build_options.lock_assignments,
    )
    if build_options.lock_days_from_start > 0:
        LOGGER.debug(
            "build_cp_sat: near-term lock constraints added",
            extra={"lock_days_from_start": build_options.lock_days_from_start},
        )

    finished, useful_words = add_progress_constraints(context)
    LOGGER.debug("build_cp_sat: progress constraints added")

    if build_options.objective_mode == "optimize":
        terms = build_objective_terms(
            books,
            ObjectiveContext(
                settings=settings,
                days=context.days,
                useful_words=useful_words,
                finished=finished,
                active_flags=context.y,
                assigned_blocks=context.x,
            ),
        )
        model.Maximize(sum(terms))
        LOGGER.debug(
            "build_cp_sat: objective added",
            extra={"term_count": len(terms)},
        )
    else:
        LOGGER.debug("build_cp_sat: objective skipped for feasibility stage")

    return model, context.x, context.y, finished, context.days
