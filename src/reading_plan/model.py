from __future__ import annotations

from datetime import date

from ortools.sat.python import cp_model

from .budget import book_day_block_limit, day_capacity_blocks, words_per_block
from .calendar import date_range
from .types import Book, Settings


def build_cp_sat(
    books: list[Book], settings: Settings
) -> tuple[cp_model.CpModel, dict[tuple[str, date], cp_model.IntVar], dict[tuple[str, date], cp_model.IntVar], dict[str, cp_model.IntVar], list[date]]:
    model = cp_model.CpModel()
    days = date_range(settings.start_date, settings.end_date)
    caps = {d: day_capacity_blocks(settings, d) for d in days}
    wpb = {b.book_id: words_per_block(b, settings) for b in books}
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

    p_scale = max(1, int(round(settings.w_priority * 100)))
    s_scale = int(round(settings.w_switch * 100))
    f_scale = max(1, int(round(settings.w_finish * 10000)))

    prio_w: dict[str, int] = {}
    for b in books:
        pr = int(b.priority)
        assert 1 <= pr <= 5, f"priority must be 1..5, got {b.priority} for {b.book_id}"
        prio_w[b.book_id] = 6 - pr

    terms: list[cp_model.LinearExpr] = []
    for book in books:
        w = prio_w[book.book_id]
        terms.extend(
            (
                p_scale * w * useful_words[book.book_id],
                f_scale * w * finished[book.book_id],
            )
        )
        terms.extend(-s_scale * y[(book.book_id, day)] for day in days)

    model.Maximize(sum(terms))

    return model, x, y, finished, days
