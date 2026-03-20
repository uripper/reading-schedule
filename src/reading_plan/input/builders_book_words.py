"""Resolve planner word totals, remaining words, and progress from payloads."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, TypeGuard

from reading_plan.input.builders_coerce import optional_int, to_float
from reading_plan.input.builders_shared import WORDS_PER_PAGE
from reading_plan.input.validate import check_condition


if TYPE_CHECKING:
    from reading_plan.api_types import BookData
    from reading_plan.input.builders_coerce import FloatInput, IntInput

MIN_PROGRESS_PERCENT = 0
MAX_PROGRESS_PERCENT = 100


@dataclass(frozen=True)
class WordStats:
    """Normalized length and progress values for one book payload."""

    words_total: int
    remaining_words: int
    progress_percent: float


def word_stats_from_data(data: BookData) -> WordStats:
    """Derive canonical planner word stats from one payload row.

    Returns:
        Computed value.
    """
    remaining_words = _parse_optional_int(
        data.get("remaining_words"),
        "remaining_words",
    )
    pages_total = _parse_optional_int(data.get("pages_total"), "pages_total")
    words_total = _words_total(data, remaining_words, pages_total)
    resolved_remaining_words = _remaining_words(
        data,
        words_total,
        pages_total,
        remaining_words,
    )
    return WordStats(
        words_total=words_total,
        remaining_words=resolved_remaining_words,
        progress_percent=_progress_percent(
            words_total,
            resolved_remaining_words,
        ),
    )


def _words_total(
    data: BookData,
    remaining_words: int | None,
    pages_total: int | None,
) -> int:
    """Resolve total words from direct total, pages, or remaining words.

    Returns:
        Computed value.

    Raises:
        TypeError: Raised when input validation fails.
    """
    words_total = _parse_optional_int(data.get("words_total"), "words_total")
    if words_total is not None:
        return _require_positive_int(words_total, "words_total")
    if pages_total is not None:
        page_count = _require_positive_int(pages_total, "pages_total")
        return page_count * WORDS_PER_PAGE
    if remaining_words is None:
        msg = "book requires remaining_words, words_total, or pages_total"
        raise TypeError(msg)
    return _derived_total_words(data, remaining_words, pages_total)


def _derived_total_words(
    data: BookData,
    remaining_words: int,
    pages_total: int | None,
) -> int:
    """Estimate total words from remaining words plus read/progress signals.

    Returns:
        Computed value.
    """
    base_remaining = _require_non_negative_int(
        remaining_words,
        "remaining_words",
    )
    words_read = _parse_optional_int(data.get("words_read"), "words_read")
    if words_read is not None:
        return base_remaining + max(0, words_read)

    pages_read = _parse_optional_int(data.get("pages_read"), "pages_read")
    if pages_read is not None:
        return _derived_total_from_pages(
            base_remaining,
            pages_read,
            pages_total,
        )
    return _derived_total_from_progress(data, base_remaining)


def _derived_total_from_pages(
    remaining_words: int,
    pages_read: int,
    pages_total: int | None,
) -> int:
    """Estimate total words from remaining words plus page progress.

    Returns:
        Computed value.
    """
    bounded_pages = max(0, pages_read)
    if pages_total is None or pages_total <= 0:
        return remaining_words + bounded_pages * WORDS_PER_PAGE
    check_condition(
        "pages_read must be less than pages_total "
        + "when remaining_words is provided",
        condition=bounded_pages < pages_total,
    )
    remaining_pages = pages_total - bounded_pages
    derived_total = round(remaining_words * pages_total / remaining_pages)
    return max(remaining_words, derived_total)


def _derived_total_from_progress(
    data: BookData,
    remaining_words: int,
) -> int:
    """Estimate total words from remaining words plus progress percent.

    Returns:
        Computed value.
    """
    progress_percent = _raw_progress_percent(data)
    if progress_percent <= MIN_PROGRESS_PERCENT:
        return remaining_words
    check_condition(
        "progress_percent must be less than 100 "
        + "when remaining_words is provided",
        condition=progress_percent < MAX_PROGRESS_PERCENT,
    )
    derived_total = round(
        remaining_words
        * MAX_PROGRESS_PERCENT
        / (MAX_PROGRESS_PERCENT - progress_percent)
    )
    return max(remaining_words, derived_total)


def _remaining_words(  # noqa: PLR0917
    data: BookData,
    words_total: int,
    pages_total: int | None,
    remaining_words: int | None,
) -> int:
    """Return canonical remaining words from input or derived progress."""
    if remaining_words is not None:
        return _require_non_negative_int(remaining_words, "remaining_words")
    words_read = _words_read(data, words_total, pages_total)
    return max(0, words_total - words_read)


def _words_read(
    data: BookData,
    words_total: int,
    pages_total: int | None,
) -> int:
    """Resolve words read from direct words, pages, or progress.

    Returns:
        Computed value.
    """
    words_read = _parse_optional_int(data.get("words_read"), "words_read")
    if words_read is not None:
        return _bounded_words_read(words_read, words_total)

    pages_read = _parse_optional_int(data.get("pages_read"), "pages_read")
    if pages_read is not None:
        estimated = _estimated_words_read_from_pages(
            pages_read,
            words_total,
            pages_total,
        )
        return _bounded_words_read(estimated, words_total)

    progress_percent = _raw_progress_percent(data)
    derived_words_read = round(
        words_total * progress_percent / MAX_PROGRESS_PERCENT
    )
    return _bounded_words_read(derived_words_read, words_total)


def _estimated_words_read_from_pages(
    pages_read: int,
    words_total: int,
    pages_total: int | None,
) -> int:
    """Estimate words read from page progress.

    Returns:
        Computed value.
    """
    bounded_pages = max(0, pages_read)
    if pages_total is None or pages_total <= 0:
        return bounded_pages * WORDS_PER_PAGE
    clamped_pages = min(bounded_pages, pages_total)
    return round(words_total * clamped_pages / pages_total)


def _progress_percent(words_total: int, remaining_words: int) -> float:
    """Return normalized progress percent from total and remaining words."""
    if words_total <= 0:
        return 0.0
    words_read = max(0, words_total - remaining_words)
    return round(
        MAX_PROGRESS_PERCENT * words_read / words_total,
        2,
    )


def _bounded_words_read(words_read: int, words_total: int) -> int:
    """Clamp derived read words into the valid total-word range.

    Returns:
        Computed value.
    """
    return min(max(0, words_read), words_total)


def _raw_progress_percent(data: BookData) -> float:
    """Parse and validate raw progress percent input.

    Returns:
        Computed value.
    """
    raw = data.get("progress_percent", 0.0)
    progress_percent = _require_float(raw, "progress_percent")
    check_condition(
        "progress_percent must be between 0 and 100",
        condition=MIN_PROGRESS_PERCENT
        <= progress_percent
        <= MAX_PROGRESS_PERCENT,
    )
    return progress_percent


def _is_int_input(value: object) -> TypeGuard[IntInput]:
    """Return whether a raw value can safely flow through integer coercion.

    This mirrors the boundary accepted by ``to_int(...)`` so the builder can
    reject obviously-wrong payload fields with a field-specific error before
    coercion happens.
    """
    return (
        isinstance(value, (int, str, bytes, bytearray))
        or hasattr(value, "__int__")
        or hasattr(value, "__index__")
    )


def _is_float_input(value: object) -> TypeGuard[FloatInput]:
    """Return whether a raw value can safely flow through float coercion.

    Progress fields accept integer-like and float-like values, but we still
    validate the runtime boundary here so error messages point at the specific
    offending book field instead of bubbling up from generic conversion code.
    """
    return (
        isinstance(value, (int, float, str, bytes, bytearray))
        or hasattr(value, "__float__")
        or hasattr(value, "__index__")
    )


def _int_input(raw: object, field: str) -> IntInput:
    """Validate and narrow a raw value into an accepted integer input.

    Returns:
        Computed value.

    Raises:
        TypeError: Raised when input validation fails.
    """
    if _is_int_input(raw):
        return raw
    msg = f"{field} must be an integer-compatible value"
    raise TypeError(msg)


def _optional_int_input(raw: object | None, field: str) -> IntInput | None:
    """Validate and narrow an optional raw value into integer input.

    Returns:
        Computed value.
    """
    return None if raw is None else _int_input(raw, field)


def _float_input(raw: object, field: str) -> FloatInput:
    """Validate and narrow a raw value into an accepted numeric input.

    Returns:
        Computed value.

    Raises:
        TypeError: Raised when input validation fails.
    """
    if _is_float_input(raw):
        return raw
    msg = f"{field} must be a numeric value"
    raise TypeError(msg)


def _parse_optional_int(raw: object | None, field: str) -> int | None:
    """Parse an optional integer field.

    Returns:
        Computed value.
    """
    return optional_int(_optional_int_input(raw, field), field)


def _require_positive_int(value: int, field: str) -> int:
    """Require a positive integer value for a numeric field.

    Returns:
        Computed value.
    """
    check_condition(f"{field} must be greater than 0", condition=value > 0)
    return value


def _require_non_negative_int(value: int, field: str) -> int:
    """Require a non-negative integer value for a numeric field.

    Returns:
        Computed value.
    """
    check_condition(f"{field} must be at least 0", condition=value >= 0)
    return value


def _require_float(raw: object, field: str) -> float:
    """Parse a required numeric field.

    Returns:
        Computed value.
    """
    return to_float(_float_input(raw, field), field)
