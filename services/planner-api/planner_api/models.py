"""Utilities for models."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ErrorBody(BaseModel):
    code: str
    message: str
    details: Any | None = None


class ErrorResponse(BaseModel):
    error: ErrorBody


class GeneratePlanPayload(BaseModel):
    planner: str = "mip"
    books: list[dict[str, Any]]
    settings: dict[str, Any]


class GeneratePlanResponse(BaseModel):
    summary: dict[str, Any]
    schedule: list[dict[str, Any]]


class AppStateV2(BaseModel):
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
    items: list[dict[str, Any]]
