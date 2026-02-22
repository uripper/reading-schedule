"""Shared model typing helpers."""

from __future__ import annotations

from datetime import date
from typing import Protocol

from ortools.sat.python import cp_model

BookDayVars = dict[tuple[str, date], cp_model.IntVar]
FinishedVars = dict[str, cp_model.IntVar]
BuildCpSatResult = tuple[
    cp_model.CpModel, BookDayVars, BookDayVars, FinishedVars, list[date]
]


class _CpSatConstraint(Protocol):
    """Protocol for CP-SAT constraints supporting conditional enforcement."""

    def OnlyEnforceIf(self, *literals: object) -> None:
        """Enable this constraint only when all provided literals are true."""


class _CpSatModelBuilder(Protocol):
    """Protocol for the subset of CP-SAT model APIs used by the planner."""

    def NewIntVar(self, lb: int, ub: int, name: str) -> cp_model.IntVar:
        """Create a bounded integer decision variable."""

    def NewBoolVar(self, name: str) -> cp_model.IntVar:
        """Create a boolean decision variable."""

    def Add(self, ct: object) -> _CpSatConstraint:
        """Add a constraint expression to the model."""

    def Maximize(self, obj: object) -> None:
        """Set the model objective to maximize the provided expression."""
