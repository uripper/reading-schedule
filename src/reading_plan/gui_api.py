"""Utilities for gui api."""

from __future__ import annotations

import argparse
import json
import sys

from .api import generate_plan
from .io import load_inputs
from .serializers import book_to_data, settings_to_data


def parse_args() -> argparse.Namespace:
    """Parse args."""
    p = argparse.ArgumentParser(description="GUI bridge for Reading Plan")
    p.add_argument(
        "--sample", action="store_true", help="Return sample payload from data files"
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
    """Run the GUI bridge command using either sample mode or stdin payload mode."""
    args = parse_args()
    try:
        if args.sample:
            books, settings = load_inputs(args.data, args.settings)
            data = {
                "books": [book_to_data(b) for b in books],
                "settings": settings_to_data(settings),
            }
            print(json.dumps({"ok": True, "data": data}))
            return 0

        payload = json.load(sys.stdin)
        print(json.dumps({"ok": True, "data": generate_plan(payload)}))
        return 0
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
