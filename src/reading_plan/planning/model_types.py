"""Shared model typing helpers."""

from __future__ import annotations

from datetime import date
from typing import TypeAlias

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

LinearExprLike: TypeAlias = CpSatLinearExprLike | IntVarLike | int
BookDayVars: TypeAlias = dict[tuple[str, date], IntVarLike]
FinishedVars: TypeAlias = dict[str, IntVarLike]
BuildCpSatResult: TypeAlias = tuple[
    CpModelLike,
    BookDayVars,
    BookDayVars,
    FinishedVars,
    list[date],
]
