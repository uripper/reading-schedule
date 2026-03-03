import type {
    FeatureFlags,
    LoadedPlannerState,
    PlannerResult,
    SessionInput,
} from "../../types/types.js";

type ScalarValue = string | number | boolean | null | undefined;

/**
 * Returns object-like state data for cross-shape compatibility reads.
 * @param saved Loaded state payload.
 * @returns Plain object record for field probing.
 */
export function toSavedRecord(
    saved: LoadedPlannerState | null | undefined,
): Record<string, unknown> {
    if (saved === null || saved === undefined) {
        return {};
    }
    return saved as Record<string, unknown>;
}

/**
 * Normalizes persisted blocked day-book map values to strict booleans.
 * @param raw Persisted blocked map keyed by `YYYY-MM-DD|book_id`.
 * @returns Sanitized blocked map.
 */
export function normalizeBlockedDayBooks(
    raw: Record<string, ScalarValue> = {},
): Record<string, boolean> {
    const OUT: Record<string, boolean> = {};
    
    Object.entries(raw).forEach(([key, value]) => {
        if (!key) {
            return;
        }
        OUT[key] = Boolean(value);
    });
    return OUT;
}

/**
 * Resolves completion map from canonical or legacy saved-state fields.
 * @param saved Canonical loaded state.
 * @param savedRecord Object-like compatibility record.
 * @returns Raw completion map.
 */
export function readRawCompletions(
    saved: LoadedPlannerState | null | undefined,
    savedRecord: Record<string, unknown>,
): Record<string, boolean> {
    if (saved?.schedule_completions) {
        return saved.schedule_completions;
    }
    const LEGACY = savedRecord.scheduleCompletions as
        | Record<string, boolean>
        | undefined;
    if (LEGACY) {
        return LEGACY;
    }
    return {};
}

/**
 * Resolves raw session payload from canonical and legacy saved-state fields.
 * @param saved Canonical loaded state.
 * @param savedRecord Object-like compatibility record.
 * @returns Raw session payload.
 */
export function readRawSessions(
    saved: LoadedPlannerState | null | undefined,
    savedRecord: Record<string, unknown>,
): unknown {
    if (saved?.sessions !== undefined) {
        return saved.sessions;
    }
    if (savedRecord.session_history !== undefined) {
        return savedRecord.session_history;
    }
    if (savedRecord.sessionHistory !== undefined) {
        return savedRecord.sessionHistory;
    }
    return [];
}

/**
 * Normalizes raw session container into supported session input rows.
 * @param rawSessions Raw array/object session payload.
 * @returns Session input rows for normalization.
 */
export function sessionInputs(rawSessions: unknown): SessionInput[] {
    if (Array.isArray(rawSessions)) {
        return rawSessions as SessionInput[];
    }
    if (rawSessions !== null && typeof rawSessions === "object") {
        return Object.values(rawSessions) as SessionInput[];
    }
    return [];
}

/**
 * Resolves saved planner result from canonical and legacy fields.
 * @param saved Canonical loaded state.
 * @param savedRecord Object-like compatibility record.
 * @returns Planner result payload when available.
 */
export function readLoadedResult(
    saved: LoadedPlannerState | null | undefined,
    savedRecord: Record<string, unknown>,
): PlannerResult | null {
    if (saved?.last_result !== undefined) {
        return saved.last_result;
    }
    const LEGACY = savedRecord.lastResult;
    if (LEGACY !== null && typeof LEGACY === "object") {
        return LEGACY as PlannerResult;
    }
    return null;
}

/**
 * Resolves feature flags from canonical and legacy saved-state fields.
 * @param saved Canonical loaded state.
 * @param savedRecord Object-like compatibility record.
 * @returns Raw feature-flag payload.
 */
export function readFeatureFlags(
    saved: LoadedPlannerState | null | undefined,
    savedRecord: Record<string, unknown>,
): Partial<FeatureFlags> {
    if (saved?.feature_flags) {
        return saved.feature_flags;
    }
    const LEGACY = savedRecord.featureFlags as
        | Partial<FeatureFlags>
        | undefined;
    if (LEGACY) {
        return LEGACY;
    }
    return {};
}
