"""Utilities for gui api."""

from __future__ import annotations

import argparse
import json
import sys
from typing import TYPE_CHECKING, TypedDict

from reading_plan.api import generate_plan
from reading_plan.input.reading_io import load_inputs
from reading_plan.input.serializers import book_to_data, settings_to_data

if TYPE_CHECKING:
    from reading_plan.api_types import PlannerInputPayload, PlannerOutputPayload


class BridgeResponse(TypedDict, total=False):
    """Response wrapper for bridge communication."""

    ok: bool
    data: PlannerOutputPayload | PlannerInputPayload | dict[str, object]
    error: str


def write_payload(payload: BridgeResponse) -> None:
    """Write JSON payload to stdout."""
    json.dump(payload, sys.stdout)
    sys.stdout.write("\n")


def read_stdin_payload() -> PlannerInputPayload:
    """Read and validate planner payload from stdin."""
    payload = json.load(sys.stdin)
    if isinstance(payload, dict):
        return payload
    msg = "planner payload must be a JSON object"
    raise TypeError(msg)


def parse_args() -> argparse.Namespace:
    """Parse args."""
    p = argparse.ArgumentParser(description="GUI bridge for Reading Plan")
    p.add_argument(
        "--sample",
        action="store_true",
        help="Return sample payload from data files",
    )
    p.add_argument(
        "--data",
        default="data/books.sample.csv",
        help="Books CSV path for --sample",
    )
    p.add_argument(
        "--settings",
        default="data/settings.json",
        help="Settings JSON path for --sample",
    )
    return p.parse_args()


def main() -> int:
    """Run the GUI bridge in sample mode or stdin payload mode."""
    args = parse_args()
    try:
        if args.sample:
            books, settings = load_inputs(args.data, args.settings)
            write_payload({
                "ok": True,
                "data": {
                    "books": [book_to_data(b) for b in books],
                    "settings": settings_to_data(settings),
                },
            })
            return 0

        payload = read_stdin_payload()
        data = generate_plan(payload)
        write_payload({"ok": True, "data": data})

    except (KeyError, OSError, RuntimeError, TypeError, ValueError) as error:
        write_payload({"ok": False, "error": str(error)})
        return 1
    else:
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
