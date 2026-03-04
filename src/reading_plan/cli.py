"""Legacy CLI compatibility wrapper for Electron planner bridge."""

from __future__ import annotations

from reading_plan.gui_api import main as gui_main


def main() -> int:
    """Run planner bridge using the canonical GUI API implementation."""
    return gui_main()


if __name__ == "__main__":
    raise SystemExit(main())
