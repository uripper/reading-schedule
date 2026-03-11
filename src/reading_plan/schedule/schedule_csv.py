"""Write schedule row data to CSV using the planner's export columns."""

from __future__ import annotations

import csv
from pathlib import Path


def write_schedule_csv(path: str, rows: list[dict[str, object]]) -> None:
    """Write schedule csv."""
    fields = [
        "date",
        "session_index",
        "book_id",
        "title",
        "minutes",
        "words_planned",
    ]
    with Path(path).open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
