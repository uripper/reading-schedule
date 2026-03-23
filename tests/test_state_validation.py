"""Regression tests for persisted mobile state validation."""

import pytest

from reading_plan.state_validation import validate_state_snapshot


def test_state_snapshot_requires_all_feature_flag_keys() -> None:
    """Feature flags should fail validation when a required key is missing."""
    snapshot = {
        "books": [],
        "settings": {},
        "sessions": [],
        "schedule_completions": {},
        "blocked_day_books": {},
        "feature_flags": {
            "gamificationEnabled": False,
            "socialEnabled": False,
        },
        "preferences": {},
        "last_result": None,
    }

    with pytest.raises(TypeError, match="invalid feature_flags"):
        validate_state_snapshot(snapshot)
