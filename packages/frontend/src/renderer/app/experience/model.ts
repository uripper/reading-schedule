import type {
    FeatureFlags,
    FeatureFlagsInput,
    Preferences,
    PreferencesInput,
} from "../../../types/types.ts";
import {
    REMINDERS_AVAILABLE,
    SOCIAL_FEATURES_AVAILABLE,
    shippedFeatureFlag,
    shippedReminderTime,
} from "./availability.ts";

export const DEFAULT_PREFERENCES: Preferences = {
    dailyGoalMinutes: 30,
    reduceMotion: false,
    reminderEnabled: false,
    reminderTime: "20:00",
    timezone: new Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
};

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
    gamificationEnabled: true,
    socialEnabled: false,
};

function normalizedDailyGoalMinutes(raw: PreferencesInput): number {
    const DAILY_GOAL_RAW =
        raw.dailyGoalMinutes ??
        raw.daily_goal_minutes ??
        DEFAULT_PREFERENCES.dailyGoalMinutes;
    const DAILY_GOAL_MINUTES = Number(DAILY_GOAL_RAW);
    if (!Number.isFinite(DAILY_GOAL_MINUTES) || DAILY_GOAL_MINUTES <= 0) {
        return DEFAULT_PREFERENCES.dailyGoalMinutes;
    }
    return Math.round(DAILY_GOAL_MINUTES);
}

/**
 * Normalize user preferences from raw input, applying defaults and handling feature availability.
 * @param raw - The raw input object containing user preferences, which may be incomplete
 * or have different naming conventions.
 * @returns A fully normalized Preferences object with all necessary fields and default values applied.
 */
export function normalizePreferences(raw: PreferencesInput = {}): Preferences {
    return {
        dailyGoalMinutes: normalizedDailyGoalMinutes(raw),
        reduceMotion: Boolean(raw.reduceMotion),
        reminderEnabled: shippedFeatureFlag(
            raw.reminderEnabled,
            REMINDERS_AVAILABLE,
        ),
        reminderTime: shippedReminderTime(
            raw.reminderTime,
            REMINDERS_AVAILABLE,
            DEFAULT_PREFERENCES.reminderTime,
        ),
        timezone: String(raw.timezone ?? DEFAULT_PREFERENCES.timezone),
    };
}

/**
 * Normalize feature flags from raw input, applying defaults and handling feature availability.
 * @param raw - The raw input object containing feature flag settings, which may be incomplete or
 * have different naming conventions.
 * @returns A fully normalized FeatureFlags object with all necessary fields and default values applied.
 */
export function normalizeFeatureFlags(
    raw: FeatureFlagsInput = {},
): FeatureFlags {
    return {
        gamificationEnabled: true,
        socialEnabled: shippedFeatureFlag(
            raw.socialEnabled,
            SOCIAL_FEATURES_AVAILABLE,
        ),
    };
}
