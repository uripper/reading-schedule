"""Utilities for report format."""

from __future__ import annotations

from .report_types import Summary


def format_summary(summary: Summary) -> str:
    """Format summary."""
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
        done = "no"
        if info["finished"]:
            done = "yes"
        lines.append(
            f"- {book_id}: {info['planned_words']}/{info['words_total']} words (finished: {done})"
        )
    return "\n".join(lines)
