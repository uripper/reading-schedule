"""Format structured planner summaries into readable plain-text output."""

from typing import TYPE_CHECKING


if TYPE_CHECKING:
    from reading_plan.reporting.report_types import Summary


def _format_book_progress_line(
    book_id: str,
    planned_words: int,
    remaining_words: int,
    finished: bool,
) -> str:
    done = "yes" if finished else "no"
    return (
        f"- {book_id}: {planned_words}/{remaining_words} words "
        f"(finished: {done})"
    )


def _optional_summary_lines(summary: Summary) -> list[str]:
    lines: list[str] = []
    if summary.get("objective") is not None:
        lines.append(f"Objective value: {summary['objective']}")
    if summary.get("note"):
        lines.append(f"Note: {summary['note']}")
    if summary.get("feasibility_warning"):
        lines.append(f"Warning: {summary['feasibility_warning']}")
    return lines


def format_summary(summary: Summary) -> str:
    """Format summary."""
    lines = [
        f"Planner: {summary['planner']} ({summary['status']})",
        f"Total planned minutes: {summary['total_planned_minutes']}",
        f"Total available minutes: {summary['total_available_minutes']}",
        f"Total required minutes: {summary['total_required_minutes']}",
    ]
    lines.extend(_optional_summary_lines(summary))
    for book_id, info in summary["per_book"].items():
        lines.append(
            _format_book_progress_line(
                book_id,
                info["planned_words"],
                info["remaining_words"],
                info["finished"],
            )
        )
    return "\n".join(lines)
