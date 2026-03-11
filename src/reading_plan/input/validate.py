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
    title_and_id_required = f"book_id and title are required for {book}"
    check_condition(
        title_and_id_required,
        condition=bool(book.book_id and book.title),
    )

    remaining_words_cannot_be_zero = (
        f"There are no words left to schedule for {book.book_id}"
    )
    check_condition(
        remaining_words_cannot_be_zero,
        condition=book.remaining_words > 0,
    )

    priority_between_one_to_five = (
        f"priority must be between 1 and 5 for {book.book_id}"
    )
    check_condition(
        priority_between_one_to_five,
        condition=book.priority in BOOK_PRIORITY_RANGE,
    )

    difficulty_between_one_and_ten = (
        f"difficulty must be 1..10 for {book.book_id}"
    )
    check_condition(
        difficulty_between_one_and_ten,
        condition=book.difficulty in BOOK_DIFFICULTY_RANGE,
    )

    min_block_above_zero = (
        f"min_blocks_per_session must be > 0 for {book.book_id}"
    )
    check_condition(
        min_block_above_zero,
        condition=book.min_blocks_per_session > 0,
    )


def _validate_book_progress(book: Book) -> None:
    """Validate read-progress and words consistency values."""
    words_full_cannot_be_less_than_remaining = (
        f"words_full cannot be less than remaining_words for {book.book_id}"
    )
    check_condition(
        words_full_cannot_be_less_than_remaining,
        condition=book.words_full is None
        or book.words_full >= book.remaining_words,
    )

    progress_between_zero_and_hundred = (
        f"progress_percent must be between 0 and 100 for {book.book_id}"
    )
    check_condition(
        progress_between_zero_and_hundred,
        condition=book.progress_percent is None
        or (
            MIN_PROGRESS_PERCENT
            <= book.progress_percent
            <= MAX_PROGRESS_PERCENT
        ),
    )


def _validate_book_limits(book: Book) -> None:
    """Validate optional daily limits and blocker invariants."""
    max_minutes_per_day_cannot_be_zero = (
        f"max_minutes_per_day must be > 0 for {book.book_id}"
    )
    check_condition(
        max_minutes_per_day_cannot_be_zero,
        condition=book.max_minutes_per_day is None
        or book.max_minutes_per_day > 0,
    )

    book_cannot_block_itself = f"book {book.book_id} cannot block itself"
    check_condition(
        book_cannot_block_itself,
        condition=book.blocked_by is None or book.blocked_by != book.book_id,
    )


def _validate_scheduled_days(book: Book) -> None:
    """Validate book-level scheduled weekday constraints."""
    book_must_have_scheduled_days = (
        f"scheduled_days is required for {book.book_id}"
    )
    check_condition(
        book_must_have_scheduled_days,
        condition=bool(book.scheduled_days),
    )

    scheduled_days_are_real = (
        f"scheduled_days must be Mon..Sun for {book.book_id}"
    )
    check_condition(
        scheduled_days_are_real,
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
    end_date_after_start = "end_date must be on or after start_date"
    check_condition(
        end_date_after_start,
        condition=settings.start_date <= settings.end_date,
    )


def _validate_settings_minutes(settings: Settings) -> None:
    """Validate settings minute sources and quantum values."""
    minutes_per_day_or_weekday_required = (
        "Set minutes_per_day or minutes_by_weekday in settings"
    )
    check_condition(
        minutes_per_day_or_weekday_required,
        condition=bool(settings.minutes_per_day or settings.minutes_by_weekday),
    )

    time_quantum_minutes_required = (
        "time_quantum_minutes must be set to a positive integer in settings"
    )
    check_condition(
        time_quantum_minutes_required,
        condition=settings.time_quantum_minutes is not None
        and settings.time_quantum_minutes > 0,
    )


def _validate_settings_positive_limits(settings: Settings) -> None:
    """Validate positive daily session and book limits."""
    max_sessions_and_books_required = (
        "Set max_sessions_per_day and max_books_per_day to positive integers"
    )
    check_condition(
        max_sessions_and_books_required,
        condition=bool(
            settings.max_sessions_per_day > 0 and settings.max_books_per_day > 0
        ),
    )


def _validate_settings_weekday_minutes(settings: Settings) -> None:
    """Validate weekday minute overrides when they are provided."""
    # TODO: Will this ever be invalid if coming from our settings?
    minutes_by_weekday_keys_valid = (
        "minutes_by_weekday keys must be Mon..Sun when provided"
    )
    weekday_keys = set(settings.minutes_by_weekday)
    check_condition(
        minutes_by_weekday_keys_valid,
        condition=not weekday_keys or weekday_keys == VALID_WEEKDAYS,
    )


def _validate_settings_difficulty_multiplier(settings: Settings) -> None:
    """Validate difficulty multiplier coverage."""
    difficulty_multiplier_keys_required = (
        "difficulty_multiplier must be empty or contain keys 1..10"
    )
    difficulty_keys = set(settings.difficulty_multiplier)
    check_condition(
        difficulty_multiplier_keys_required,
        condition=(
            not difficulty_keys or difficulty_keys == VALID_DIFFICULTY_KEYS
        ),
    )


def _validate_settings_plan_mode(settings: Settings) -> None:
    """Validate planner mode selection."""
    plan_mode_required = (
        f"plan_mode must be set to one of: {', '.join(PLAN_MODES)}"
    )
    check_condition(
        plan_mode_required,
        condition=settings.plan_mode in PLAN_MODES,
    )
