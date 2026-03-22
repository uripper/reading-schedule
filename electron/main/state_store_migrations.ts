import type {
    JsonValue,
    LoadedPlannerState,
    PlannerStateLoadResult,
    PlannerStateLoadWarningCode,
    PlannerStateSnapshot,
} from "../types/types.ts";

const CURRENT_STATE_VERSION = 1;
const LEGACY_STATE_VERSION = 0;

interface MigrationOutcome {
    didMigrate: boolean;
    state: LoadedPlannerState;
}

interface MigrationResult {
    migratedState: LoadedPlannerState;
    shouldRewrite: boolean;
}

export type { MigrationResult };

function stateRecord(
    state: LoadedPlannerState | null,
): Record<string, JsonValue> | null {
    if (state === null) {
        return null;
    }
    return state as Record<string, JsonValue>;
}

function stateVersion(state: LoadedPlannerState | null): number | null {
    const RECORD = stateRecord(state);
    if (RECORD === null) {
        return null;
    }
    const VERSION = RECORD.state_version;
    if (typeof VERSION !== "number" || !Number.isInteger(VERSION)) {
        return LEGACY_STATE_VERSION;
    }
    return VERSION;
}

function withCurrentVersion(
    state: LoadedPlannerState,
): LoadedPlannerState {
    return {
        ...state,
        state_version: CURRENT_STATE_VERSION,
    };
}

function migrateLegacyState(
    state: LoadedPlannerState,
): MigrationOutcome {
    if (state.state_version !== undefined) {
        return {
            didMigrate: false,
            state,
        };
    }
    return {
        didMigrate: true,
        state: withCurrentVersion(state),
    };
}

export function migrateLoadedState(
    state: LoadedPlannerState | null,
): MigrationResult | null {
    if (state === null) {
        return null;
    }
    const VERSION = stateVersion(state);
    if (VERSION === null) {
        return null;
    }
    if (VERSION === CURRENT_STATE_VERSION) {
        return {
            migratedState: state,
            shouldRewrite: false,
        };
    }
    if (VERSION === LEGACY_STATE_VERSION) {
        const OUTCOME = migrateLegacyState(state);
        return {
            migratedState: OUTCOME.state,
            shouldRewrite: OUTCOME.didMigrate,
        };
    }
    throw new Error(`Unsupported saved state version: ${VERSION}`);
}

function mergedWarningCode(
    warningCode: PlannerStateLoadWarningCode | undefined,
): PlannerStateLoadWarningCode {
    if (warningCode !== undefined) {
        return warningCode;
    }
    return "MIGRATED_STATE_VERSION";
}

function mergedWarningMessage(
    warningMessage: string | undefined,
): string {
    const MIGRATION_MESSAGE =
        "Migrated saved data to the current state snapshot version.";
    if (warningMessage === undefined || warningMessage.length === 0) {
        return MIGRATION_MESSAGE;
    }
    return `${warningMessage} ${MIGRATION_MESSAGE}`;
}

export function withMigrationWarning(
    loadResult: PlannerStateLoadResult,
): PlannerStateLoadResult {
    return {
        ...loadResult,
        warningCode: mergedWarningCode(loadResult.warningCode),
        warningMessage: mergedWarningMessage(loadResult.warningMessage),
    };
}

export function versionedSnapshot(
    state: LoadedPlannerState,
): PlannerStateSnapshot {
    return withCurrentVersion(state) as PlannerStateSnapshot;
}