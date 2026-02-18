from __future__ import annotations

from datetime import date
from typing import Protocol, cast

from ortools.sat.python import cp_model

from .budget import book_day_block_limit, day_capacity_blocks, words_per_block
from .calendar import date_range
from .model_objective import build_objective_terms
from .types import Book, Settings


BookDayVars = dict[tuple[str, date], cp_model.IntVar]
FinishedVars = dict[str, cp_model.IntVar]
BuildCpSatResult = tuple[cp_model.CpModel, BookDayVars, BookDayVars, FinishedVars, list[date]]


class _CpSatModelBuilder(Protocol):
    def NewIntVar(self, lb: int, ub: int, name: str) -> cp_model.IntVar: ...

    def NewBoolVar(self, name: str) -> cp_model.IntVar: ...

    def Add(self, ct: object) -> object: ...

    def Maximize(self, obj: object) -> None: ...


def build_cp_sat(
    books: list[Book], settings: Settings
) -> BuildCpSatResult:
    raw_model = cp_model.CpModel()
    model = cast(_CpSatModelBuilder, raw_model)
    days = date_range(settings.start_date, settings.end_date)
    caps = {d: day_capacity_blocks(settings, d) for d in days}
    wpb = {b.book_id: words_per_block(b, settings) for b in books}
    book_map = {book.book_id: book for book in books}
    x: dict[tuple[str, date], cp_model.IntVar] = {}
    y: dict[tuple[str, date], cp_model.IntVar] = {}

    for bi, book in enumerate(books):
        per_book_cap = book_day_block_limit(book, settings)
        for di, day in enumerate(days):
            upper = min(caps[day], per_book_cap)
            key = (book.book_id, day)
            x[key] = model.NewIntVar(0, upper, f"x_{bi}_{di}")
            y[key] = model.NewBoolVar(f"y_{bi}_{di}")
            model.Add(x[key] <= upper * y[key])
            model.Add(x[key] >= book.min_blocks_per_session * y[key])

    for day in days:
        model.Add(sum(x[(b.book_id, day)] for b in books) <= caps[day])
        model.Add(sum(y[(b.book_id, day)] for b in books) <= settings.max_books_per_day)
        model.Add(sum(y[(b.book_id, day)] for b in books) <= settings.max_sessions_per_day)

    for bi, book in enumerate(books):
        blocker_id = book.blocked_by
        if not blocker_id:
            continue
        blocker = book_map[blocker_id]
        for di, day in enumerate(days):
            progressed_before = sum(
                wpb[blocker_id] * x[(blocker_id, prev_day)]
                for prev_day in days[:di]
            )
            blocker_done = model.NewBoolVar(f"ready_{bi}_{di}")
            model.Add(progressed_before >= blocker.words_total).OnlyEnforceIf(blocker_done)
            model.Add(progressed_before <= blocker.words_total - 1).OnlyEnforceIf(blocker_done.Not())
            model.Add(y[(book.book_id, day)] <= blocker_done)

    finished: dict[str, cp_model.IntVar] = {}
    useful_words: dict[str, cp_model.IntVar] = {}
    for bi, book in enumerate(books):
        progress = sum(wpb[book.book_id] * x[(book.book_id, d)] for d in days)
        overshoot = wpb[book.book_id] * max(1, book.min_blocks_per_session - 1)
        model.Add(progress <= book.words_total + overshoot)

        useful_words[book.book_id] = model.NewIntVar(0, book.words_total, f"u_{bi}")
        model.Add(useful_words[book.book_id] <= progress)
        model.Add(useful_words[book.book_id] <= book.words_total)

        finished[book.book_id] = model.NewBoolVar(f"f_{bi}")
        model.Add(progress >= book.words_total * finished[book.book_id])
        if book.deadline:
            if due_days := [d for d in days if d <= book.deadline]:
                model.Add(sum(wpb[book.book_id] * x[(book.book_id, d)] for d in due_days) >= book.words_total)

    terms = build_objective_terms(books, settings, days, useful_words, finished, y, x)
    model.Maximize(sum(terms))

    return raw_model, x, y, finished, days
