"""Shared model typing helpers."""

from datetime import date

from reading_plan.planning.cp_sat_types import (
    CpModelLike,
    CpSolverLike,
    IntVarLike,
    LinearExprLike as CpSatLinearExprLike,
)


__all__ = [
    "BookDayVars",
    "BuildCpSatResult",
    "CpModelLike",
    "CpSolverLike",
    "FinishedVars",
    "IntVarLike",
    "LinearExprLike",
]

type LinearExprLike = CpSatLinearExprLike | IntVarLike | int
type BookDayVars = dict[tuple[str, date], IntVarLike]
type FinishedVars = dict[str, IntVarLike]
type BuildCpSatResult = tuple[
    CpModelLike,
    BookDayVars,
    BookDayVars,
    FinishedVars,
    list[date],
]

type Assignments = dict[tuple[str, date], int]
