import type { PlannerResult } from "./types.js";
import type { Session } from "../sessions/normalize.js";
import { DEFAULT_FEATURE_FLAGS, DEFAULT_PREFERENCES } from "./experience/index.js";

export type AppRuntimeState = {
  lastResult: PlannerResult | null;
  ready: boolean;
  preferences: typeof DEFAULT_PREFERENCES;
  featureFlags: typeof DEFAULT_FEATURE_FLAGS;
  scheduleCompletions: Record<string, boolean>;
  sessions: Session[];
};

export function createRuntimeState(): AppRuntimeState {
  return {
    lastResult: null,
    ready: false,
    preferences: { ...DEFAULT_PREFERENCES },
    featureFlags: { ...DEFAULT_FEATURE_FLAGS },
    scheduleCompletions: {},
    sessions: [],
  };
}
