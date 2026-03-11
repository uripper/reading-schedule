from pathlib import Path

from reading_plan.bridge_logging import (
    configure_bridge_logger,
    get_bridge_logger,
    log_incoming_data,
)


def _flush_log_file(log_path: Path) -> str:
    bridge_logger = get_bridge_logger("reading_plan")
    for handler in bridge_logger.handlers:
        handler.flush()
    return log_path.read_text(encoding="utf-8")


def test_configure_bridge_logger_writes_structured_metadata(
    tmp_path: Path,
) -> None:
    log_path = tmp_path / "bridge.log"
    logger = configure_bridge_logger(
        request_id="request-42",
        log_path=log_path,
    )

    logger.debug(
        "metadata event",
        extra={"exec_file": "module.py", "payload": {"books": 3}},
    )

    logged = _flush_log_file(log_path)
    assert "request=request-42" in logged
    assert "metadata event" in logged
    assert '"exec_file": "module.py"' in logged
    assert '"payload": {"books": 3}' in logged


def test_log_incoming_data_writes_type_summary(tmp_path: Path) -> None:
    log_path = tmp_path / "bridge.log"
    logger = configure_bridge_logger(
        request_id="request-types",
        log_path=log_path,
    )

    payload = {
        "books": [{"title": "Book"}],
        "settings": {"start_date": "2026-01-01"},
    }
    log_incoming_data(
        logger,
        event="payload types",
        file_path="api.py",
        value=payload,
    )

    logged = _flush_log_file(log_path)
    assert "payload types" in logged
    assert '"value_type": "dict"' in logged
    assert '"books": "list"' in logged
    assert '"settings": "dict"' in logged


def test_get_bridge_logger_uses_child_namespace() -> None:
    logger = get_bridge_logger("reading_plan.api")
    assert logger.name == "reading_plan.bridge.api"
