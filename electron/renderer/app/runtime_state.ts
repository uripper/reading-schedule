

import { DEFAULT_FEATURE_FLAGS, DEFAULT_PREFERENCES } from "./experience/index.js";
import type { AppRuntimeState } from "../../types/app_runtime_state.js";
export type { AppRuntimeState };

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
