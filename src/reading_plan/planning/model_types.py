"""Shared model typing helpers."""

from __future__ import annotations

from datetime import date
from typing import Any, TypeAlias

IntVarLike: TypeAlias = Any
LinearExprLike: TypeAlias = Any
ConstraintLike: TypeAlias = Any
CpModelLike: TypeAlias = Any
CpModelModuleLike: TypeAlias = Any
BookDayVars = dict[tuple[str, date], IntVarLike]
FinishedVars = dict[str, IntVarLike]
BuildCpSatResult = tuple[
    CpModelLike, BookDayVars, BookDayVars, FinishedVars, list[date]
]
