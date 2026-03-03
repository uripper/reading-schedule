import type { AppRuntimeState } from "../../types/types.js";
import {
    DEFAULT_FEATURE_FLAGS,
    DEFAULT_PREFERENCES,
} from "./experience/index.js";
import { emptyDerivedIndexes } from "./state_indexes.js";

/**
 * Creates the initial mutable runtime state for the planner renderer.
 * @returns Default runtime state values before persisted data is loaded.
 */
export function createRuntimeState(): AppRuntimeState {
    return {
        blockedDayBooks: {},
        derived: emptyDerivedIndexes(),
        featureFlags: { ...DEFAULT_FEATURE_FLAGS },
        lastResult: null,
        preferences: { ...DEFAULT_PREFERENCES },
        ready: false,
        scheduleCompletions: {},
        sessions: [],
    };
}
