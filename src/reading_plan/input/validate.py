"""Validate normalized books and settings before they reach the planner."""

from typing import TYPE_CHECKING

from reading_plan.planner_types import PLAN_MODES, WEEKDAYS


if TYPE_CHECKING:
    from typing import Literal

    from reading_plan.planner_types import Book, Settings

MIN_PROGRESS_PERCENT = 0
MAX_PROGRESS_PERCENT = 100
# Books can be prioritized 1 (highest) to 5 (lowest).
BOOK_PRIORITY_RANGE = range(1, 6)
# Books can have difficulty 1 (easiest) to 10 (hardest).
BOOK_DIFFICULTY_RANGE = range(1, 11)
VALID_WEEKDAYS = frozenset(WEEKDAYS)
VALID_DIFFICULTY_KEYS = frozenset(BOOK_DIFFICULTY_RANGE)


def check_condition(
    msg: str,
    *,
    error_type: Literal["type", "value"] = "value",
    condition: bool,
) -> None:
    """Raise an error based on error_type.

    :param msg: The error message to include if the condition is not met.
    :param error_type: The type of error to raise if the condition is not met.
    :param condition: The boolean condition to check. If False, an error is
                        raised.
    """
    if condition:
        return
    if error_type == "type":
        raise TypeError(msg)
    if error_type == "value":
        raise ValueError(msg)


def _validate_required_fields(book: Book) -> None:
    """Validate required fields and core range constraints."""
    check_condition(
        f"book_id and title are required for {book}",
        condition=bool(book.book_id and book.title),
    )

    check_condition(
        f"There are no words left to schedule for {book.book_id}",
        condition=book.remaining_words > 0,
    )

    check_condition(
        f"priority must be between 1 and 5 for {book.book_id}",
        condition=book.priority in BOOK_PRIORITY_RANGE,
    )

    check_condition(
        f"difficulty must be 1..10 for {book.book_id}",
        condition=book.difficulty in BOOK_DIFFICULTY_RANGE,
    )

    check_condition(
        f"min_blocks_per_session must be > 0 for {book.book_id}",
        condition=book.min_blocks_per_session > 0,
    )


def _validate_book_progress(book: Book) -> None:
    """Validate read-progress and words consistency values."""
    check_condition(
        f"words_full cannot be less than remaining_words for {book.book_id}",
        condition=book.words_full is None
        or book.words_full >= book.remaining_words,
    )

    check_condition(
        f"progress_percent must be between 0 and 100 for {book.book_id}",
        condition=book.progress_percent is None
        or (
            MIN_PROGRESS_PERCENT
            <= book.progress_percent
            <= MAX_PROGRESS_PERCENT
        ),
    )


def _validate_book_limits(book: Book) -> None:
    """Validate optional daily limits and blocker invariants."""
    check_condition(
        f"max_minutes_per_day must be > 0 for {book.book_id}",
        condition=book.max_minutes_per_day is None
        or book.max_minutes_per_day > 0,
    )

    check_condition(
        f"book {book.book_id} cannot block itself",
        condition=book.blocked_by is None or book.blocked_by != book.book_id,
    )


def _validate_scheduled_days(book: Book) -> None:
    """Validate book-level scheduled weekday constraints."""
    check_condition(
        f"scheduled_days is required for {book.book_id}",
        condition=bool(book.scheduled_days),
    )

    check_condition(
        f"scheduled_days must be Mon..Sun for {book.book_id}",
        condition=set(book.scheduled_days) <= VALID_WEEKDAYS,
    )


def validate_book(book: Book) -> None:
    """Validate book."""
    _validate_required_fields(book)
    _validate_book_progress(book)
    _validate_book_limits(book)
    _validate_scheduled_days(book)


def validate_settings(settings: Settings) -> None:
    """Validate settings."""
    _validate_settings_dates(settings)
    _validate_settings_minutes(settings)
    _validate_settings_positive_limits(settings)
    _validate_settings_weekday_minutes(settings)
    _validate_settings_difficulty_multiplier(settings)
    _validate_settings_plan_mode(settings)


def _validate_settings_dates(settings: Settings) -> None:
    """Validate settings date ordering."""
    check_condition(
        "end_date must be on or after start_date",
        condition=settings.start_date <= settings.end_date,
    )


def _validate_settings_minutes(settings: Settings) -> None:
    """Validate settings minute sources and quantum values."""
    check_condition(
        "Set minutes_per_day or minutes_by_weekday in settings",
        condition=bool(settings.minutes_per_day or settings.minutes_by_weekday),
    )

    check_condition(
        "time_quantum_minutes must be set to a positive integer in settings",
        condition=settings.time_quantum_minutes is not None
        and settings.time_quantum_minutes > 0,
    )


def _validate_settings_positive_limits(settings: Settings) -> None:
    """Validate positive daily session and book limits."""
    check_condition(
        "Set max_sessions_per_day and max_books_per_day to positive integers",
        condition=settings.max_sessions_per_day > 0
        and settings.max_books_per_day > 0,
    )


def _validate_settings_weekday_minutes(settings: Settings) -> None:
    """Validate weekday minute overrides when they are provided."""
    weekday_keys = set(settings.minutes_by_weekday)
    check_condition(
        "minutes_by_weekday keys must be Mon..Sun when provided",
        condition=not weekday_keys or weekday_keys == VALID_WEEKDAYS,
    )


def _validate_settings_difficulty_multiplier(settings: Settings) -> None:
    """Validate difficulty multiplier coverage."""
    difficulty_keys = set(settings.difficulty_multiplier)
    check_condition(
        "difficulty_multiplier must be empty or contain keys 1..10",
        condition=(
            not difficulty_keys or difficulty_keys == VALID_DIFFICULTY_KEYS
        ),
    )


def _validate_settings_plan_mode(settings: Settings) -> None:
    """Validate planner mode selection."""
    check_condition(
        f"plan_mode must be set to one of: {', '.join(PLAN_MODES)}",
        condition=settings.plan_mode in PLAN_MODES,
    )
