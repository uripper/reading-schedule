import type { FeatureFlags, Preferences } from "./app_experience.js";
import type { Book } from "./books_types.js";
import type { Session } from "./core_sessions.js";
import type { PlannerResult } from "./planner_result.js";
import type { PlannerSettings } from "./planner_settings.js";

export interface PlannerStateSnapshot {
  settings: PlannerSettings;
  books: Book[];
  preferences: Preferences;
  feature_flags: FeatureFlags;
  schedule_completions: Record<string, boolean>;
  blocked_day_books: Record<string, boolean>;
  sessions: Session[];
  last_result: PlannerResult | null;
}

export interface LoadedPlannerState {
  settings?: PlannerSettings;
  books?: Book[];
  preferences?: Partial<Preferences>;
  feature_flags?: Partial<FeatureFlags>;
  schedule_completions?: Record<string, boolean>;
  blocked_day_books?: Record<string, boolean>;
  sessions?: Session[];
  last_result?: PlannerResult | null;
}

export interface PlanGeneratePayload {
  planner: "mip";
  books: Book[];
  settings: PlannerSettings;
}

export interface PlannerSaveResult {
  ok?: boolean;
  error?: string;
}
