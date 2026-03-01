import {
    type FeatureFlagRawValue,
    type ReminderTimeRawValue,
} from "../../../types/types.js";
export const REMINDERS_AVAILABLE = false;
export const SOCIAL_FEATURES_AVAILABLE = false;
export const RECOMMENDATIONS_AVAILABLE = false;

/**
 * Normalizes a string to a boolean or returns undefined if not recognized.
 * @param value String value to normalize.
 * @returns true/false or undefined if not a recognized pattern.
 */
function normalizeStringFlag(value: string): boolean | undefined {
    const NORMALIZED = value.trim().toLowerCase();
    if (NORMALIZED === "true" || NORMALIZED === "1") {
        return true;
    }
    if (NORMALIZED === "false" || NORMALIZED === "0") {
        return false;
    }
    return undefined;
}

/**
 * Normalizes a number to a boolean or returns undefined if not recognized.
 * @param value Number value to normalize.
 * @returns true/false or undefined if not 0/1.
 */
function normalizeNumberFlag(value: number): boolean | undefined {
    if (value === 1) {
        return true;
    }
    if (value === 0) {
        return false;
    }
    return undefined;
}

/**
 * Normalizes persisted or user-provided flag-like values.
 * "true"/"1" and 1 map to true; "false"/"0" and 0 map to false.
 * @param rawValue Raw persisted/user flag value.
 * @param isAvailable Whether this feature is shipped/enabled.
 * @returns Normalized feature flag value.
 */
export function shippedFeatureFlag(
    rawValue: FeatureFlagRawValue,
    isAvailable: boolean,
): boolean {
    if (!isAvailable) {
        return false;
    }

    if (typeof rawValue === "boolean") {
        return rawValue;
    }

    if (typeof rawValue === "string") {
        const RESULT = normalizeStringFlag(rawValue);
        if (RESULT !== undefined) {
            return RESULT;
        }
    }

    if (typeof rawValue === "number") {
        const RESULT = normalizeNumberFlag(rawValue);
        if (RESULT !== undefined) {
            return RESULT;
        }
    }

    return Boolean(rawValue);
}

/**
 * Returns a trimmed reminder time string, or the default when unavailable/empty.
 * @param rawValue Raw persisted reminder-time value.
 * @param isAvailable Whether reminders are shipped/enabled.
 * @param defaultReminderTime Fallback reminder time.
 * @returns Normalized reminder time string.
 */
export function shippedReminderTime(
    rawValue: ReminderTimeRawValue,
    isAvailable: boolean,
    defaultReminderTime: string,
): string {
    if (!isAvailable) {
        return defaultReminderTime;
    }
    const VALUE = String(rawValue ?? "").trim();
    if (!VALUE) {
        return defaultReminderTime;
    }
    return VALUE;
}
