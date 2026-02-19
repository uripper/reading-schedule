"""Utilities for models."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ErrorBody(BaseModel):
    """Structured error details returned by API endpoints."""

    code: str
    message: str
    details: Any | None = None


class ErrorResponse(BaseModel):
    """Top-level error envelope used for API error responses."""

    error: ErrorBody


class GeneratePlanPayload(BaseModel):
    """Request body for generating a reading plan."""

    planner: str = "mip"
    books: list[dict[str, Any]]
    settings: dict[str, Any]


class GeneratePlanResponse(BaseModel):
    """Response body produced after successful plan generation."""

    summary: dict[str, Any]
    schedule: list[dict[str, Any]]


class AppStateV2(BaseModel):
    """Version 2 persisted application state shared with the client."""

    model_config = ConfigDict(extra="allow")

    schemaVersion: int = Field(default=2)
    books: list[dict[str, Any]]
    settings: dict[str, Any]
    sessions: list[dict[str, Any]] = Field(default_factory=list)
    preferences: dict[str, Any] = Field(default_factory=dict)
    featureFlags: dict[str, Any] = Field(default_factory=dict)
    lastResult: dict[str, Any] | None = None
    updatedAt: datetime


class BookSearchResponse(BaseModel):
    """Response payload for book search results."""

    items: list[dict[str, Any]]
