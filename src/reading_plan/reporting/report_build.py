"""Build summary data that compares planned work against remaining work."""

from typing import TYPE_CHECKING

from reading_plan.planning.budget import (
    calendar_minutes,
    required_total_minutes,
)
from reading_plan.schedule.schedule import compute_plan_totals

if TYPE_CHECKING:
    from reading_plan.planner_types import Book, PlanResult, Settings
    from reading_plan.reporting.report_types import BookProgress, Summary


def build_summary(
    books: list[Book], settings: Settings, result: PlanResult
) -> Summary:
    """Build summary."""
    per_book, total_minutes = compute_plan_totals(
        books, settings, result.assignments
    )
    available = sum(calendar_minutes(settings).values())
    required = required_total_minutes(books, settings)

    progress: dict[str, BookProgress] = {
        book.book_id: {
            "title": book.title,
            "planned_words": per_book[book.book_id],
            "remaining_words": book.remaining_words,
            "finished": per_book[book.book_id] >= book.remaining_words,
        }
        for book in books
    }
    warning = ""
    if required > available:
        warning = (
            f"Required minutes ({required}) exceed "
            f"available minutes ({available})."
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
