from __future__ import annotations

from reading_plan.api import generate_plan
from reading_plan.serializers import book_to_data, settings_to_data
from tests.helpers import demo_books, demo_settings


def test_generate_plan_from_json_payload():
    books = [book_to_data(b) for b in demo_books()]
    settings = settings_to_data(demo_settings())
    payload = {"planner": "greedy", "books": books, "settings": settings}
    data = generate_plan(payload)
    assert "summary" in data and "schedule" in data
    assert data["summary"]["status"] in {"FEASIBLE", "OPTIMAL"}
    assert isinstance(data["schedule"], list)


def test_generate_plan_allows_missing_book_id():
    book = book_to_data(demo_books()[0])
    book.pop("book_id")
    settings = settings_to_data(demo_settings())
    data = generate_plan({"planner": "greedy", "books": [book], "settings": settings})
    assert data["schedule"]
    assert data["schedule"][0]["book_id"]
