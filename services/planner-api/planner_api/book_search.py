from __future__ import annotations

import json
from typing import Any
from urllib.parse import quote
from urllib.request import urlopen


def search_books(query: str) -> list[dict[str, Any]]:
    q = query.strip()
    if len(q) < 2:
        return []

    url = f"https://openlibrary.org/search.json?q={quote(q)}&limit=8"
    try:
        with urlopen(url, timeout=8) as response:  # noqa: S310 - user-facing lookup endpoint
            payload = json.loads(response.read().decode("utf-8"))
    except Exception:
        return []

    docs: Any = []
    if isinstance(payload, dict):
        docs = payload.get("docs", [])
    out: list[dict[str, Any]] = []
    for row in docs:
        if not isinstance(row, dict):
            continue
        author_names = row.get("author_name", [])
        author = ""
        if isinstance(author_names, list) and author_names:
            author = author_names[0]
        cover_id = row.get("cover_i")
        cover_url = ""
        if isinstance(cover_id, int):
            cover_url = f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"
        pages_estimate = None
        if isinstance(row.get("number_of_pages_median"), (int, float)):
            pages_estimate = int(row["number_of_pages_median"])
        out.append(
            {
                "title": str(row.get("title") or "Untitled"),
                "author": str(author),
                "year": str(row.get("first_publish_year") or ""),
                "pages_estimate": pages_estimate,
                "cover_url": cover_url,
                "source": "Open Library",
            }
        )
    return out
