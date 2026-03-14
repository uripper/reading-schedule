import type { AppRuntimeState } from "../../types/types.ts";
import {
    DEFAULT_FEATURE_FLAGS,
    DEFAULT_PREFERENCES,
} from "./experience/model.ts";
import { emptyDerivedIndexes } from "./state_indexes.ts";

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
