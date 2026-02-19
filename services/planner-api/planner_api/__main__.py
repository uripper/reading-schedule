"""Command-line entrypoint for planner api."""

from __future__ import annotations

import uvicorn


if __name__ == "__main__":
    uvicorn.run("planner_api.main:app", host="0.0.0.0", port=8000, reload=True)
