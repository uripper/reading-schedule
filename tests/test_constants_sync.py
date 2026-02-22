"""Test cases for test constants sync."""

from __future__ import annotations

from pathlib import Path
import re

from reading_plan.input.builders_shared import WORDS_PER_PAGE


def test_words_per_page_matches_renderer_constant() -> None:
    """Test that words per page matches renderer constant."""
    constants_dir = (
        Path(__file__).resolve().parents[1] / "electron" / "renderer" / "books"
    )
    constants_ts = constants_dir / "constants.ts"
    constants_js = constants_dir / "constants.js"
    constants_path = constants_ts
    if not constants_path.exists():
        constants_path = constants_js
    text = constants_path.read_text(encoding="utf-8")
    match = re.search(r"export const WORDS_PER_PAGE = (\d+);", text)
    assert match, "WORDS_PER_PAGE was not found in renderer constants"
    assert int(match[1]) == WORDS_PER_PAGE
