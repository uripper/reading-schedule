"""Centralized logging helpers for planner bridge runtimes."""

import json
import logging
import os
from pathlib import Path
from typing import TypeGuard


BRIDGE_LOGGER_NAME = "reading_plan.bridge"
BRIDGE_LOG_PATH_ENV = "READING_PLAN_BRIDGE_LOG_PATH"
BRIDGE_REQUEST_ID_ENV = "READING_PLAN_BRIDGE_REQUEST_ID"
DEFAULT_LOG_PATH = "data/planner_bridge_debug.log"
_FILE_HANDLER_NAME = "reading_plan.bridge.file_handler"
_TYPE_SUMMARY_LIMIT = 20
_SAMPLE_RECORD = logging.LogRecord(
    "",
    logging.INFO,
    "",
    0,
    "",
    (),
    None,
)
_STANDARD_RECORD_FIELDS = frozenset(_SAMPLE_RECORD.__dict__.keys())
_EXCLUDED_METADATA_FIELDS = frozenset({"asctime", "message"})


def _is_object_mapping(value: object) -> TypeGuard[dict[object, object]]:
    return isinstance(value, dict)


def _is_object_list(value: object) -> TypeGuard[list[object]]:
    return isinstance(value, list)


class StructuredBridgeFormatter(logging.Formatter):
    """Formatter that appends JSON metadata for custom log fields."""

    def format(self, record: logging.LogRecord) -> str:
        """Format one log record with a compact metadata suffix."""
        message = super().format(record)
        metadata = _record_metadata(record)
        if not metadata:
            return message
        metadata_text = json.dumps(
            metadata,
            sort_keys=True,
            default=str,
        )
        return f"{message} | meta={metadata_text}"


def configure_bridge_logger(
    request_id: str | None = None,
    log_path: str | Path | None = None,
) -> logging.Logger:
    """Configure the shared bridge logger with file output."""
    resolved_request_id = _resolve_request_id(request_id)
    resolved_log_path = _resolve_log_path(log_path)
    resolved_log_path.parent.mkdir(parents=True, exist_ok=True)

    logger = logging.getLogger(BRIDGE_LOGGER_NAME)
    logger.setLevel(logging.DEBUG)
    logger.propagate = False
    _configure_file_handler(
        logger,
        resolved_log_path,
        resolved_request_id,
    )

    logger.debug(
        "bridge logger configured",
        extra={
            "exec_file": __file__,
            "log_path": str(resolved_log_path),
        },
    )
    return logger


def get_bridge_logger(module_name: str) -> logging.Logger:
    """Return a module-scoped child logger under the bridge namespace."""
    child_name = _child_logger_name(module_name)
    return logging.getLogger(child_name)


def log_file_execution(
    logger: logging.Logger | logging.LoggerAdapter,
    *,
    file_path: str,
    entrypoint: str,
) -> None:
    """Emit a standard log event for a Python file execution point."""
    logger.debug(
        "python file executing",
        extra={
            "entrypoint": entrypoint,
            "exec_file": file_path,
        },
    )


def log_incoming_data(
    logger: logging.Logger | logging.LoggerAdapter,
    *,
    event: str,
    file_path: str,
    value: object,
) -> None:
    """Log incoming payload type details using a consistent schema."""
    logger.debug(
        event,
        extra={
            "exec_file": file_path,
            "type_summary": summarize_value_types(value),
        },
    )


def summarize_value_types(value: object) -> dict[str, object]:
    """Summarize top-level type information for diagnostics."""
    summary: dict[str, object] = {
        "value_type": type(value).__name__,
    }
    if _is_object_mapping(value):
        summary.update(_summarize_mapping_types(value))
        return summary
    if _is_object_list(value):
        summary.update(_summarize_list_types(value))
    return summary


def _resolve_request_id(request_id: str | None) -> str:
    """Resolve request ID from explicit value, env, or fallback default."""
    if request_id:
        return request_id
    env_request_id = os.environ.get(BRIDGE_REQUEST_ID_ENV, "").strip()
    if env_request_id:
        return env_request_id
    return "unknown"


def _resolve_log_path(log_path: str | Path | None) -> Path:
    """Resolve log file path from explicit value, env, or default path."""
    if log_path is not None:
        return Path(log_path)
    configured = os.environ.get(BRIDGE_LOG_PATH_ENV, "").strip()
    if configured:
        return Path(configured)
    return Path(DEFAULT_LOG_PATH)


def _configure_file_handler(
    logger: logging.Logger,
    log_path: Path,
    request_id: str,
) -> None:
    """Attach a single file handler for the bridge logger."""
    existing = _find_bridge_handler(logger)
    if existing is not None:
        if Path(existing.baseFilename) == log_path:
            existing.setFormatter(_build_formatter(request_id))
            return
        logger.removeHandler(existing)
        existing.close()

    handler = logging.FileHandler(log_path, encoding="utf-8")
    handler.set_name(_FILE_HANDLER_NAME)
    handler.setFormatter(_build_formatter(request_id))
    logger.addHandler(handler)


def _build_formatter(request_id: str) -> StructuredBridgeFormatter:
    """Build formatter with stable request ID defaults."""
    format_text = (
        "%(asctime)s | %(levelname)s | "
        "request=%(request_id)s | logger=%(name)s | %(message)s"
    )
    return StructuredBridgeFormatter(
        format_text,
        defaults={"request_id": request_id},
    )


def _find_bridge_handler(logger: logging.Logger) -> logging.FileHandler | None:
    """Find the existing file handler owned by bridge logging."""
    for handler in logger.handlers:
        if not isinstance(handler, logging.FileHandler):
            continue
        if handler.get_name() == _FILE_HANDLER_NAME:
            return handler
    return None


def _record_metadata(record: logging.LogRecord) -> dict[str, object]:
    """Extract normalized custom fields from a log record."""
    metadata: dict[str, object] = {}
    for key, value in record.__dict__.items():
        if key in _STANDARD_RECORD_FIELDS:
            continue
        if key in _EXCLUDED_METADATA_FIELDS:
            continue
        metadata[key] = _normalize_metadata(value)
    return metadata


def _normalize_metadata(value: object) -> object:
    """Normalize metadata values so they can be serialized as JSON."""
    normalized: object = str(value)
    if isinstance(value, (str, int, float, bool)) or value is None:
        normalized = value
    elif isinstance(value, Path):
        normalized = str(value)
    elif _is_object_mapping(value):
        normalized = _normalize_mapping(value)
    elif isinstance(value, (list, tuple, set)):
        normalized = [_normalize_metadata(item) for item in value]
    return normalized


def _normalize_mapping(value: dict[object, object]) -> dict[str, object]:
    """Normalize mapping metadata keys and values recursively."""
    normalized: dict[str, object] = {}
    for key, item in value.items():
        normalized[str(key)] = _normalize_metadata(item)
    return normalized


def _summarize_mapping_types(
    value: dict[object, object],
) -> dict[str, object]:
    """Summarize dictionary keys and top-level value types."""
    sampled: dict[str, str] = {}
    sampled_keys: list[str] = []
    for index, (key, item) in enumerate(value.items()):
        if index >= _TYPE_SUMMARY_LIMIT:
            break
        key_name = str(key)
        sampled_keys.append(key_name)
        sampled[key_name] = type(item).__name__
    return {
        "item_count": len(value),
        "keys": sorted(sampled_keys),
        "value_types": sampled,
    }


def _summarize_list_types(value: list[object]) -> dict[str, object]:
    """Summarize list length and a bounded sample of item types."""
    sampled_items = value[:_TYPE_SUMMARY_LIMIT]
    sampled_types = sorted({type(item).__name__ for item in sampled_items})
    return {
        "item_count": len(value),
        "item_types": sampled_types,
    }


def _child_logger_name(module_name: str) -> str:
    """Build a child logger name for a Python module."""
    if module_name == "reading_plan":
        return BRIDGE_LOGGER_NAME
    if module_name.startswith("reading_plan."):
        suffix = module_name.removeprefix("reading_plan.")
        return f"{BRIDGE_LOGGER_NAME}.{suffix}"
    return f"{BRIDGE_LOGGER_NAME}.{module_name}"
