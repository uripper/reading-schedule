import type { Book } from "./books_types.js";
import type { Session } from "./core_sessions.js";
import type { PlannerApi } from "./planner_api.js";
import type { PlannerResult } from "./planner_result.js";

export type SetStatus = (message: string, isError?: boolean) => void;

export type AnnouncePoliteness = "polite" | "assertive";

export interface DocumentPreferencesInput {
  theme?: string;
  reduceMotion?: boolean;
}

export interface DialogFocusOptions {
  initialFocusSelector?: string | null;
}

export type LogLevel = "info" | "error";

export interface LogPayload {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: unknown;
}

export interface ActivateTabOptions {
  focusPanel?: boolean;
}

export type ZoomApi = Pick<PlannerApi, "zoomIn" | "zoomOut" | "zoomReset">;

export interface ShortcutBindings {
  announce(this: void, message: string, politeness?: AnnouncePoliteness): void;
  plannerApi: ZoomApi;
}

export interface UpdateStatsArgs {
  books: Book[];
  sessions: Session[];
  lastResult: PlannerResult | null;
  scheduleCompletions: Record<string, boolean>;
  dailyGoalMinutes: number;
}
