from __future__ import annotations

import re
from pathlib import Path

from reading_plan.builders_shared import WORDS_PER_PAGE


def test_words_per_page_matches_renderer_constant() -> None:
    constants_js = Path(__file__).resolve().parents[1] / "electron" / "renderer" / "books" / "constants.js"
    text = constants_js.read_text(encoding="utf-8")
    match = re.search(r"export const WORDS_PER_PAGE = (\d+);", text)
    assert match, "WORDS_PER_PAGE was not found in renderer constants"
    assert int(match[1]) == WORDS_PER_PAGE
