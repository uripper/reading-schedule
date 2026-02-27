import type { createAnnouncer } from "../renderer/accessibility/index.js";
import type { createDashboardRuntime } from "../renderer/app/dashboard_runtime.js";
import type { createInitRuntime } from "../renderer/app/init/index.js";
import type {
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_PREFERENCES,
} from "../renderer/app/experience/index.js";
import type { createRuntimeState } from "../renderer/app/runtime_state.js";

import type { Book } from "./types_books.js";
import type { PlannerApi, PlannerSettings } from "./types_planner.js";
import type { PlannerResult } from "./types_planner.js";
import type { Session } from "./types_core.js";
import type { FeatureFlags, Preferences } from "./types_experience.js";

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

export type PlannerApiGlobal = typeof globalThis & { plannerApi?: PlannerApi };

export type DayMinutesMap = Map<string, number>;

export interface DayMinutesArgs {
  sessions: Session[];
  lastResult: PlannerResult | null;
  scheduleCompletions: Record<string, boolean>;
  year: number | null;
}

export interface AppRuntimeState {
  lastResult: PlannerResult | null;
  ready: boolean;
  preferences: typeof DEFAULT_PREFERENCES;
  featureFlags: typeof DEFAULT_FEATURE_FLAGS;
  scheduleCompletions: Record<string, boolean>;
  blockedDayBooks: Record<string, boolean>;
  sessions: Session[];
}

export interface DraftDataParams {
  sessions: Session[];
  collectBooks(): Book[];
  collectSettings(): PlannerSettings;
  preferences: Preferences;
  featureFlags: FeatureFlags;
  scheduleCompletions: Record<string, boolean>;
  blockedDayBooks: Record<string, boolean>;
  lastResult: PlannerResult | null;
}

export type AddLog = (message: string) => void;

export interface PersistQueueState {
  ready: boolean;
  preferences: Preferences;
  featureFlags: FeatureFlags;
  scheduleCompletions: Record<string, boolean>;
  blockedDayBooks: Record<string, boolean>;
  lastResult: PlannerResult | null;
}

export interface PersistQueueArgs {
  plannerApi: Pick<PlannerApi, "saveState">;
  state: PersistQueueState;
  getSessions(this: void): Session[];
  collectBooks(this: void): Book[];
  collectSettings(this: void): PlannerSettings;
  addLog(this: void, message: string): void;
}

export interface PersistQueue {
  persistDraft(): Promise<boolean>;
  queuePersist(): void;
}

export interface AppBootstrapContext {
  announce: ReturnType<typeof createAnnouncer>;
  announceForPlanController(message: string, politeness?: string): void;
  dashboards: ReturnType<typeof createDashboardRuntime>;
  plannerApi: PlannerApi;
  persistDraft(): Promise<boolean>;
  queuePersist(): void;
  runtime: ReturnType<typeof createInitRuntime>;
  setStatus(message: string, isError?: boolean): void;
  state: ReturnType<typeof createRuntimeState>;
}
