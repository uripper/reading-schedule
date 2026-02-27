

import { DEFAULT_FEATURE_FLAGS, DEFAULT_PREFERENCES } from "./experience/index.js";
import { emptyDerivedIndexes } from "./state_indexes.js";
import type { AppRuntimeState } from "../../types/types_app.js";

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
    derived: emptyDerivedIndexes(),
  };
}
