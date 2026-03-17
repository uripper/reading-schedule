"""Bridge the desktop app to the planner over stdin/stdout JSON messages."""

import argparse
import json
import sys
from typing import TYPE_CHECKING, TypedDict, TypeGuard

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
    data: PlannerOutputPayload | PlannerInputPayload | dict[str, object]
    error: str


BRIDGE_LOG_PATH_ENV = BRIDGE_LOG_PATH_ENV_SHARED
BRIDGE_REQUEST_ID_ENV = BRIDGE_REQUEST_ID_ENV_SHARED
DEFAULT_LOG_PATH = DEFAULT_LOG_PATH_SHARED


def configure_logger() -> logging.Logger:
    """Return the configured planner bridge logger."""
    return configure_bridge_logger()


def write_payload(payload: BridgeResponse) -> None:
    """Write JSON payload to stdout."""
    json.dump(payload, sys.stdout)
    sys.stdout.write("\n")


def _require_payload_text(payload_text: str) -> None:
    """Raise ``ValueError`` when stdin provides an empty payload.

    Raises:
        ValueError: If ``payload_text`` is blank after trimming.
    """
    if not payload_text.strip():
        msg = "planner payload is empty"
        raise ValueError(msg)


def _parse_payload_json(
    payload_text: str,
    logger: logging.Logger,
) -> object:
    """Return decoded planner payload JSON.

    Raises:
        ValueError: If ``payload_text`` is not valid JSON.
    """
    try:
        return json.loads(payload_text)
    except json.JSONDecodeError as error:
        logger.exception("Planner stdin JSON decode failed")
        msg = "planner payload is not valid JSON"
        raise ValueError(msg) from error


def _is_planner_payload(payload: object) -> TypeGuard[PlannerInputPayload]:
    """Return whether a decoded payload has the expected top-level shape."""
    return isinstance(payload, dict)


def _planner_payload(payload: object) -> PlannerInputPayload:
    """Return a validated planner payload object.

    Raises:
        TypeError: If ``payload`` is not a JSON object.
    """
    if _is_planner_payload(payload):
        return payload
    msg = "planner payload must be a JSON object"
    raise TypeError(msg)


def _log_payload_details(
    logger: logging.Logger,
    payload: PlannerInputPayload,
) -> None:
    """Emit normalized diagnostics for a decoded planner payload."""
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


def read_stdin_payload(logger: logging.Logger) -> PlannerInputPayload:
    """Return a validated planner payload read from stdin."""
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
    _require_payload_text(payload_text)
    payload = _planner_payload(_parse_payload_json(payload_text, logger))
    _log_payload_details(logger, payload)
    return payload


def parse_args() -> argparse.Namespace:
    """Return parsed CLI arguments."""
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


def _sample_payload_data(args: argparse.Namespace) -> BridgeResponse:
    """Return serialized sample payload data for the desktop UI."""
    books, settings = load_inputs(args.data, args.settings)
    return {
        "ok": True,
        "data": {
            "books": [book_to_data(book) for book in books],
            "settings": settings_to_data(settings),
        },
    }


def _handle_sample_request(
    args: argparse.Namespace,
    logger: logging.Logger,
) -> BridgeResponse:
    """Return the sample-mode payload response with diagnostics."""
    logger.debug("Sample request received")
    response = _sample_payload_data(args)
    sample_data = response["data"]
    if isinstance(sample_data, dict):
        books = sample_data.get("books")
        if isinstance(books, list):
            logger.debug(
                "Sample payload returned",
                extra={"book_count": len(books)},
            )
    return response


def _handle_generate_request(logger: logging.Logger) -> BridgeResponse:
    """Return the generated-plan response for a stdin payload."""
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
    return {"ok": True, "data": data}


def _response_payload(
    args: argparse.Namespace,
    logger: logging.Logger,
) -> BridgeResponse:
    """Return the bridge response payload for the current request."""
    if args.sample:
        return _handle_sample_request(args, logger)
    return _handle_generate_request(logger)


def _log_main_args(
    args: argparse.Namespace,
    logger: logging.Logger,
) -> None:
    """Emit standard startup diagnostics for GUI bridge execution."""
    log_file_execution(logger, file_path=__file__, entrypoint="main")
    log_incoming_data(
        logger,
        event="Planner GUI args type summary",
        file_path=__file__,
        value=vars(args),
    )


def _handled_error_response(
    error: KeyError | OSError | RuntimeError | TypeError | ValueError,
    logger: logging.Logger,
) -> int:
    """Return the standard handled-error response exit code."""
    logger.error("Bridge handled exception", exc_info=error)
    write_payload({"ok": False, "error": str(error)})
    return 1


def main() -> int:
    """Return the bridge process exit code."""
    args = parse_args()
    logger = configure_logger()
    _log_main_args(args, logger)
    try:
        response = _response_payload(args, logger)
    except (KeyError, OSError, RuntimeError, TypeError, ValueError) as error:
        return _handled_error_response(error, logger)
    write_payload(response)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
