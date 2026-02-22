"""CLI entrypoint for generating Bartleby reading plans."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from reading_plan.input.io import load_inputs
from reading_plan.input.serializers import book_to_data, settings_to_data
from reading_plan.planning.solve import solve_plan
from reading_plan.reporting.report import build_summary, format_summary
from reading_plan.schedule.schedule import to_schedule_rows, write_schedule_csv


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments for the planner CLI."""
    p = argparse.ArgumentParser(description="Bartleby")
    p.add_argument(
        "--data",
        default="data/books.sample.csv",
        help="Path to books CSV",
    )
    p.add_argument(
        "--settings", default="data/settings.json", help="Path to settings JSON"
    )
    p.add_argument(
        "--output", default="data/schedule.csv", help="Output schedule CSV path"
    )
    p.add_argument(
        "--planner",
        choices=["mip", "greedy"],
        default="mip",
        help="Planner to run",
    )
    p.add_argument(
        "--print-inputs",
        action="store_true",
        help="Print parsed inputs and exit",
    )
    return p.parse_args()


def main() -> int:
    """Run the CLI workflow and return the process exit code."""
    args = parse_args()
    books, settings = load_inputs(args.data, args.settings)
    if args.print_inputs:
        {
            "books": [book_to_data(b) for b in books],
            "settings": settings_to_data(settings),
        }
        return 0

    result = solve_plan(books, settings, planner=args.planner)
    rows = to_schedule_rows(books, settings, result.assignments)
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    write_schedule_csv(args.output, rows)

    build_summary(books, settings, result)
    return 0 if result.status in {"OPTIMAL", "FEASIBLE"} else 2


if __name__ == "__main__":
    raise SystemExit(main())
