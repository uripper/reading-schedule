import type { PlannerResult } from "../../types/types.js";
import type { Session } from "../sessions/normalize.js";
import { DEFAULT_FEATURE_FLAGS, DEFAULT_PREFERENCES } from "./experience/index.js";

export interface AppRuntimeState {
  lastResult: PlannerResult | null;
  ready: boolean;
  preferences: typeof DEFAULT_PREFERENCES;
  featureFlags: typeof DEFAULT_FEATURE_FLAGS;
  scheduleCompletions: Record<string, boolean>;
  blockedDayBooks: Record<string, boolean>;
  sessions: Session[];
}

/**
 * Creates the initial mutable runtime state for the planner renderer.
 * @returns Default runtime state values before persisted data is loaded.
 */
export function createRuntimeState(): AppRuntimeState {
  return {
    lastResult: null,
    ready: false,
    preferences: { ...DEFAULT_PREFERENCES },
    featureFlags: { ...DEFAULT_FEATURE_FLAGS },
    scheduleCompletions: {},
    blockedDayBooks: {},
    sessions: [],
  };
}
