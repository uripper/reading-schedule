"""Convert scheduled sessions into JSON-safe row dictionaries."""

from typing import TYPE_CHECKING

from reading_plan.schedule.schedule_sessions import iter_sessions

if TYPE_CHECKING:
    from reading_plan.api_types import ScheduleRow
    from reading_plan.planner_types import Book, Settings
    from reading_plan.planning.model_types import Assignments


def to_schedule_rows(
    books: list[Book],
    settings: Settings,
    assignments: Assignments,
) -> list[ScheduleRow]:
    """Convert to schedule rows."""
    return [
        {
            "date": day.isoformat(),
            "session_index": idx,
            "book_id": book.book_id,
            "title": book.title,
            "minutes": minutes,
            "words_planned": words,
        }
        for day, idx, book, minutes, words in iter_sessions(
            books, settings, assignments
        )
    ]
