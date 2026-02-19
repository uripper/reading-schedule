"""Utilities for state store."""

from __future__ import annotations

import json
import os
from pathlib import Path

from .models import AppStateV2


def _state_path() -> Path:
    """Resolve the planner state file path from env override or user home."""
    if explicit := os.getenv("PLANNER_API_STATE_FILE", "").strip():
        return Path(explicit)

    base = Path.home() / ".reading_schedule"
    return base / "planner_state_v2.json"


def load_state() -> AppStateV2 | None:
    """Load state."""
    path = _state_path()
    try:
        return AppStateV2.model_validate_json(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None


def save_state(state: AppStateV2) -> None:
    """Save state."""
    path = _state_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(state.model_dump(mode="json"), indent=2) + "\n", encoding="utf-8"
    )
