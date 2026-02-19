"""Utilities for book search."""

from __future__ import annotations

import json
from typing import Any
from urllib.parse import quote
from urllib.request import urlopen


def _docs_from_payload(payload: object) -> list[dict[str, Any]]:
    """Extract document rows from an OpenLibrary payload."""
    if not isinstance(payload, dict):
        return []
    raw_docs = payload.get("docs", [])
    if not isinstance(raw_docs, list):
        return []
    return [row for row in raw_docs if isinstance(row, dict)]


def _author_from_row(row: dict[str, Any]) -> str:
    """Get first author name from a search result row."""
    author_names = row.get("author_name", [])
    if isinstance(author_names, list) and author_names:
        return str(author_names[0])
    return ""


def _cover_url_from_row(row: dict[str, Any]) -> str:
    """Build cover image URL when a cover id is available."""
    cover_id = row.get("cover_i")
    if isinstance(cover_id, int):
        return f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"
    return ""


def _pages_estimate_from_row(row: dict[str, Any]) -> int | None:
    """Extract median page estimate from a search result row."""
    pages_median = row.get("number_of_pages_median")
    return int(pages_median) if isinstance(pages_median, (int, float)) else None


def _lookup_item_from_row(row: dict[str, Any]) -> dict[str, Any]:
    """Map a raw OpenLibrary row into the API response shape."""
    return {
        "title": str(row.get("title") or "Untitled"),
        "author": _author_from_row(row),
        "year": str(row.get("first_publish_year") or ""),
        "pages_estimate": _pages_estimate_from_row(row),
        "cover_url": _cover_url_from_row(row),
        "source": "Open Library",
    }


def search_books(query: str) -> list[dict[str, Any]]:
    """Execute search books."""
    q = query.strip()
    if len(q) < 2:
        return []

    url = f"https://openlibrary.org/search.json?q={quote(q)}&limit=8"
    try:
        with urlopen(
            url, timeout=8
        ) as response:  # noqa: S310 - user-facing lookup endpoint
            payload = json.loads(response.read().decode("utf-8"))
    except Exception:
        return []

    docs = _docs_from_payload(payload)
    return [_lookup_item_from_row(row) for row in docs]
