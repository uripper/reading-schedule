"""Utilities for io."""

from __future__ import annotations

import json
from pathlib import Path
from typing import TYPE_CHECKING, cast

from reading_plan.bridge_logging import (
    get_bridge_logger,
    log_file_execution,
    log_incoming_data,
)
from reading_plan.input.builders import book_from_data, settings_from_data

if TYPE_CHECKING:
    from reading_plan.api_types import BookData
    from reading_plan.planner_types import Book, Settings


LOGGER = get_bridge_logger(__name__)


def read_book_data(path: str) -> list[BookData]:
    """Load raw book payload rows from a JSON file."""
    raw = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        msg = "books file must contain a JSON array"
        raise ValueError(msg)
    rows: list[BookData] = []
    for item in raw:
        if not isinstance(item, dict):
            msg = "each book entry must be a JSON object"
            raise ValueError(msg)
        rows.append(cast("BookData", item))
    return rows


def load_books(path: str) -> list[Book]:
    """Load books.

    :param path: path to the books file
    :return: list of Book models
    """
    log_file_execution(LOGGER, file_path=__file__, entrypoint="load_books")
    log_incoming_data(
        LOGGER,
        event="load_books: input path type summary",
        file_path=__file__,
        value=path,
    )
    books = [book_from_data(row) for row in read_book_data(path)]
    if not books:
        msg = "books file is empty"
        raise ValueError(msg)
    return books


def load_settings(path: str) -> Settings:
    """Load settings.

    :param path: path to the settings file
    :return: Settings model
    """
    log_file_execution(LOGGER, file_path=__file__, entrypoint="load_settings")
    log_incoming_data(
        LOGGER,
        event="load_settings: input path type summary",
        file_path=__file__,
        value=path,
    )
    raw = json.loads(Path(path).read_text(encoding="utf-8"))
    return settings_from_data(raw)


def load_inputs(
    books_path: str, settings_path: str
) -> tuple[list[Book], Settings]:
    """Load inputs.

    :param books_path: path to the books file
    :param settings_path: path to the settings file
    :return: tuple of list of Book models and Settings model
    """
    log_file_execution(LOGGER, file_path=__file__, entrypoint="load_inputs")
    log_incoming_data(
        LOGGER,
        event="load_inputs: combined input type summary",
        file_path=__file__,
        value={
            "books_path": books_path,
            "settings_path": settings_path,
        },
    )
    return load_books(books_path), load_settings(settings_path)
