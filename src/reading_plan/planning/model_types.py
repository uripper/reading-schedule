"""Shared model typing helpers."""

from __future__ import annotations

from datetime import date
from typing import TypeAlias

from ortools.sat.python.cp_model import CpModel, IntVar, LinearExpr

LinearExprLike: TypeAlias = LinearExpr | IntVar | int
BookDayVars: TypeAlias = dict[tuple[str, date], IntVar]
FinishedVars: TypeAlias = dict[str, IntVar]
BuildCpSatResult: TypeAlias = tuple[
    CpModel,
    BookDayVars,
    BookDayVars,
    FinishedVars,
    list[date],
]
