"""Utilities for builders."""

from __future__ import annotations

from reading_plan.input.builders_book import book_from_data
from reading_plan.input.builders_settings import settings_from_data
from reading_plan.input.builders_shared import WORDS_PER_PAGE

__all__ = ["WORDS_PER_PAGE", "book_from_data", "settings_from_data"]
