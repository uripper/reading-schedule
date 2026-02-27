import type { Book } from "./books_types.js";
import type { Session } from "./core_sessions.js";
import type { PlannerResult } from "./planner_result.js";
import type { PlannerSettings } from "./planner_settings.js";
import type { FeatureFlags, Preferences } from "./app_experience.js";

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
