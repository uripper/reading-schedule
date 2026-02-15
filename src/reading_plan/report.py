from __future__ import annotations

from typing import Optional, TypedDict

from .budget import calendar_minutes, required_total_minutes, words_per_block
from .types import Book, PlanResult, Settings


class BookProgress(TypedDict):
    title: str
    planned_words: int
    words_total: int
    finished: bool


class Summary(TypedDict):
    planner: str
    status: str
    objective: Optional[int]
    note: str
    total_planned_minutes: int
    total_available_minutes: int
    total_required_minutes: int
    feasibility_warning: str
    per_book: dict[str, BookProgress]


def build_summary(books: list[Book], settings: Settings, result: PlanResult) -> Summary:
    book_map = {b.book_id: b for b in books}
    per_book = {b.book_id: 0 for b in books}
    total_minutes = 0
    for (book_id, _day), blocks in result.assignments.items():
        book = book_map[book_id]
        per_book[book_id] += blocks * words_per_block(book, settings)
        total_minutes += blocks * settings.time_quantum_minutes

    available = sum(calendar_minutes(settings).values())
    required = required_total_minutes(books, settings)
    progress: dict[str, BookProgress] = {
        b.book_id: {
            "title": b.title,
            "planned_words": per_book[b.book_id],
            "words_total": b.words_total,
            "finished": per_book[b.book_id] >= b.words_total,
        }
        for b in books
    }
    warning = ""
    if required > available:
        warning = (
            f"Required minutes ({required}) exceed available minutes ({available})."
        )
    return {
        "planner": result.planner,
        "status": result.status,
        "objective": result.objective,
        "note": result.note,
        "total_planned_minutes": total_minutes,
        "total_available_minutes": available,
        "total_required_minutes": required,
        "feasibility_warning": warning,
        "per_book": progress,
    }


def format_summary(summary: Summary) -> str:
    lines = [
        f"Planner: {summary['planner']} ({summary['status']})",
        f"Total planned minutes: {summary['total_planned_minutes']}",
        f"Total available minutes: {summary['total_available_minutes']}",
        f"Total required minutes: {summary['total_required_minutes']}",
    ]
    if summary.get("objective") is not None:
        lines.append(f"Objective value: {summary['objective']}")
    if summary.get("note"):
        lines.append(f"Note: {summary['note']}")
    if summary.get("feasibility_warning"):
        lines.append(f"Warning: {summary['feasibility_warning']}")
    for book_id, info in summary["per_book"].items():
        done = "yes" if info["finished"] else "no"
        lines.append(
            f"- {book_id}: {info['planned_words']}/{info['words_total']} words (finished: {done})"
        )
    return "\n".join(lines)
