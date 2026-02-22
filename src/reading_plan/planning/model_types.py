"""Shared model typing helpers."""

from __future__ import annotations

from datetime import date

from ortools.sat.python import cp_model

BookDayVars = dict[tuple[str, date], cp_model.IntVar]
FinishedVars = dict[str, cp_model.IntVar]
BuildCpSatResult = tuple[
    cp_model.CpModel, BookDayVars, BookDayVars, FinishedVars, list[date]
]
