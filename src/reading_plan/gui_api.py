"""Bridge the desktop app to the planner over stdin/stdout JSON messages.

Modes:
- ``--sample`` returns serialized sample books/settings from disk.
- default mode reads planner payload JSON from stdin and returns plan output.

Response schema:
- ``{"ok": true, "data": ...}`` on success.
- ``{"ok": false, "error": "..."}`` on handled failures.
"""

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
    """Response envelope exchanged over stdout.

    Fields:
        ok: Success marker for desktop bridge callers.
        data: Successful payload body for sample or planner responses.
        error: Human-readable error when ``ok`` is false.
    """

    ok: bool
    data: PlannerOutputPayload | PlannerInputPayload | dict[str, object]
    error: str


BRIDGE_LOG_PATH_ENV = BRIDGE_LOG_PATH_ENV_SHARED
BRIDGE_REQUEST_ID_ENV = BRIDGE_REQUEST_ID_ENV_SHARED
DEFAULT_LOG_PATH = DEFAULT_LOG_PATH_SHARED


def configure_logger() -> logging.Logger:
    """Return the configured planner bridge logger.

    Returns:
        Configured bridge logger instance.
    """
    return configure_bridge_logger()


def write_payload(payload: BridgeResponse) -> None:
    """Write one JSON payload line to stdout for IPC consumers."""
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

    Returns:
        Decoded JSON payload.

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
    """Return whether a decoded payload has the expected top-level shape.

    Returns:
        True when payload is a JSON object.
    """
    return isinstance(payload, dict)


def _planner_payload(payload: object) -> PlannerInputPayload:
    """Return a validated planner payload object.

    Returns:
        Validated planner payload.

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
    """Return a validated planner payload read from stdin.

    Returns:
        Validated planner request payload.
    """
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
    """Return parsed CLI arguments for bridge execution modes.

    Returns:
        Parsed CLI namespace.
    """
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
    """Return serialized sample payload data for the desktop UI.

    Returns:
        Successful sample response payload.
    """
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
    """Return the sample-mode payload response with diagnostics.

    Returns:
        Successful sample response payload.
    """
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
    """Return the generated-plan response for a stdin payload.

    Returns:
        Successful generated-plan response payload.
    """
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
    """Return the bridge response payload for the current request.

    Returns:
        Response payload for sample or generation mode.
    """
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
    """Return the standard handled-error response exit code.

    The response is always emitted to stdout to preserve the bridge contract
    expected by desktop callers.

    Returns:
        Non-zero exit code for handled failures.
    """
    logger.error("Bridge handled exception", exc_info=error)
    write_payload({"ok": False, "error": str(error)})
    return 1


def main() -> int:
    """Return the bridge process exit code.

    Handled exceptions are converted to structured ``ok=false`` payloads.

    Returns:
        Process exit code.
    """
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
