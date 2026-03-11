"""Bridge the desktop app to the planner over stdin/stdout JSON messages."""

import argparse
import json
import sys
import traceback
from typing import TYPE_CHECKING, TypedDict

from reading_plan.api import generate_plan
from reading_plan.bridge_logging import (
    BRIDGE_LOG_PATH_ENV as BRIDGE_LOG_PATH_ENV_SHARED,
    BRIDGE_REQUEST_ID_ENV as BRIDGE_REQUEST_ID_ENV_SHARED,
    DEFAULT_LOG_PATH as DEFAULT_LOG_PATH_SHARED,
    configure_bridge_logger,
    log_file_execution,
    log_incoming_data,
)
from reading_plan.input.reading_io import load_inputs
from reading_plan.input.serializers import book_to_data, settings_to_data

if TYPE_CHECKING:
    import logging

    from reading_plan.api_types import PlannerInputPayload, PlannerOutputPayload


class BridgeResponse(TypedDict, total=False):
    """Response wrapper for bridge communication."""

    ok: bool
    data: "PlannerOutputPayload | PlannerInputPayload | dict[str, object]"
    error: str


BRIDGE_LOG_PATH_ENV = BRIDGE_LOG_PATH_ENV_SHARED
BRIDGE_REQUEST_ID_ENV = BRIDGE_REQUEST_ID_ENV_SHARED
DEFAULT_LOG_PATH = DEFAULT_LOG_PATH_SHARED


def configure_logger() -> "logging.Logger":
    """Configure planner bridge logger with file output."""
    return configure_bridge_logger()


def write_payload(payload: BridgeResponse) -> None:
    """Write JSON payload to stdout."""
    json.dump(payload, sys.stdout)
    sys.stdout.write("\n")


def read_stdin_payload(logger: "logging.Logger") -> "PlannerInputPayload":
    """Read and validate planner payload from stdin with diagnostics."""
    payload_text = sys.stdin.read()
    log_file_execution(
        logger,
        file_path=__file__,
        entrypoint="read_stdin_payload",
    )
    logger.debug(
        "Planner stdin payload bytes received",
        extra={"stdin_bytes": len(payload_text)},
    )
    if not payload_text.strip():
        msg = "planner payload is empty"
        raise ValueError(msg)

    payload: PlannerInputPayload
    try:
        payload = json.loads(payload_text)
    except json.JSONDecodeError as error:
        logger.exception("Planner stdin JSON decode failed")
        msg = "planner payload is not valid JSON"
        raise ValueError(msg) from error

    if isinstance(payload, dict):
        log_incoming_data(
            logger,
            event="Planner stdin payload type summary",
            file_path=__file__,
            value=payload,
        )
        logger.debug(
            "Planner stdin payload decoded",
            extra={
                "book_count": len(payload.get("books", [])),
                "payload_keys": sorted(payload.keys()),
            },
        )
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
        default="data/books.sample.json",
        help="Books JSON path for --sample",
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
    logger = configure_logger()
    log_file_execution(logger, file_path=__file__, entrypoint="main")
    log_incoming_data(
        logger,
        event="Planner GUI args type summary",
        file_path=__file__,
        value=vars(args),
    )
    try:
        if args.sample:
            logger.debug("Sample request received")
            books, settings = load_inputs(args.data, args.settings)
            write_payload({
                "ok": True,
                "data": {
                    "books": [book_to_data(b) for b in books],
                    "settings": settings_to_data(settings),
                },
            })
            logger.debug(
                "Sample payload returned", extra={"book_count": len(books)}
            )
            return 0

        payload = read_stdin_payload(logger)
        logger.debug(
            "Planner request payload read",
            extra={"book_count": len(payload.get("books", []))},
        )
        logger.debug("Planner generation starting")
        data = generate_plan(payload)
        logger.debug("Planner generation returned")
        logger.debug(
            "Planner generation completed",
            extra={"schedule_count": len(data.get("schedule", []))},
        )
        write_payload({"ok": True, "data": data})

    except (KeyError, OSError, RuntimeError, TypeError, ValueError) as error:
        logger.exception("Bridge handled exception")
        write_payload({"ok": False, "error": str(error)})
        return 1
    except Exception as error:  # pragma: no cover - defensive envelope
        logger.exception("Bridge unhandled exception")
        traceback.print_exc(file=sys.stderr)
        write_payload({"ok": False, "error": f"Unhandled exception: {error}"})
        return 1
    else:
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
