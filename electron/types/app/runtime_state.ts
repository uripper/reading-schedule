import type { DEFAULT_FEATURE_FLAGS, DEFAULT_PREFERENCES } from "../../renderer/app/experience/index.js";
import type { Session } from "../../renderer/sessions/normalize.js";
import type { PlannerResult } from "../types.js";

export interface AppRuntimeState {
  lastResult: PlannerResult | null;
  ready: boolean;
  preferences: typeof DEFAULT_PREFERENCES;
  featureFlags: typeof DEFAULT_FEATURE_FLAGS;
  scheduleCompletions: Record<string, boolean>;
  blockedDayBooks: Record<string, boolean>;
  sessions: Session[];
}
