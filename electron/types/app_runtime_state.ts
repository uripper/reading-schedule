import type { DEFAULT_FEATURE_FLAGS, DEFAULT_PREFERENCES } from "../../renderer/app/experience/index.js";
import type { Session } from "./core_sessions.js";
import type { PlannerResult } from "./planner_result.js";

export interface AppRuntimeState {
  lastResult: PlannerResult | null;
  ready: boolean;
  preferences: typeof DEFAULT_PREFERENCES;
  featureFlags: typeof DEFAULT_FEATURE_FLAGS;
  scheduleCompletions: Record<string, boolean>;
  blockedDayBooks: Record<string, boolean>;
  sessions: Session[];
}
