"""Load planner JSON input files and convert them into normalized models."""

import json
from pathlib import Path
from typing import TYPE_CHECKING, TypeGuard

from reading_plan.bridge_logging import (
    get_bridge_logger,
    log_file_execution,
    log_incoming_data,
)
from reading_plan.input.builders import book_from_data, settings_from_data
from reading_plan.input.validate import check_condition


if TYPE_CHECKING:
    from reading_plan.api_types import BookData
    from reading_plan.planner_types import Book, Settings


LOGGER = get_bridge_logger(__name__)


def _is_book_data_row(value: object) -> TypeGuard[BookData]:
    return isinstance(value, dict) and all(
        isinstance(key, str) for key in value
    )


def read_book_data(path: str) -> list[BookData]:
    """Load raw book payload rows from a JSON file."""
    raw = json.loads(Path(path).read_text(encoding="utf-8"))
    check_condition(
        f"books file '{path}' must contain a JSON array",
        error_type="type",
        condition=isinstance(raw, list),
    )

    check_condition(
        f"books file '{path}' must contain JSON objects",
        error_type="type",
        condition=all(_is_book_data_row(item) for item in raw),
    )
    return [item for item in raw if _is_book_data_row(item)]


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
    check_condition(
        f"books file '{path}' cannot be empty",
        condition=len(books) > 0,
    )
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
