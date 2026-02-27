import type { LoadedPlannerState, PlannerResult } from "../../types/types.js";
import type { SessionInput } from "../../types/types_core.js";
import type { FeatureFlags } from "../../types/types_experience.js";

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
  raw: Record<string, string | number | boolean | null | undefined> = {},
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  Object.entries(raw).forEach(([key, value]) => {
    if (!key) {
      return;
    }
    out[key] = Boolean(value);
  });
  return out;
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
  const legacy = savedRecord.scheduleCompletions as
    | Record<string, boolean>
    | undefined;
  if (legacy) {
    return legacy;
  }
  return {};
}

/**
 * Resolves blocked day-book map from canonical or legacy saved-state fields.
 * @param saved Canonical loaded state.
 * @param savedRecord Object-like compatibility record.
 * @returns Raw blocked day-book map.
 */
export function readRawBlockedDayBooks(
  saved: LoadedPlannerState | null | undefined,
  savedRecord: Record<string, unknown>,
): Record<string, string | number | boolean | null | undefined> {
  if (saved?.blocked_day_books) {
    return saved.blocked_day_books;
  }
  const legacy = savedRecord.blockedDayBooks as
    | Record<string, string | number | boolean | null | undefined>
    | undefined;
  if (legacy) {
    return legacy;
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
  const legacy = savedRecord.lastResult;
  if (legacy !== null && typeof legacy === "object") {
    return legacy as PlannerResult;
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
  const legacy = savedRecord.featureFlags as Partial<FeatureFlags> | undefined;
  if (legacy) {
    return legacy;
  }
  return {};
}
