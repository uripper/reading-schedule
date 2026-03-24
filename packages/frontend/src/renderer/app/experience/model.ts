import type {
    FeatureFlags,
    FeatureFlagsInput,
    Preferences,
    PreferencesInput,
} from "../../../types/types.ts";
import {
    RECOMMENDATIONS_AVAILABLE,
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
    theme: "system",
    timezone: new Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
};

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
    gamificationEnabled: false,
    recommendationsEnabled: false,
    socialEnabled: false,
};

/**
 * Check if a given value is a supported theme.
 * @param value - The value to check.
 * @returns True if the value is a supported theme, false otherwise.
 */
export function isSupportedTheme(value: string): value is Preferences["theme"] {
    return value === "system" || value === "light" || value === "dark";
}

function normalizedTheme(raw: PreferencesInput): Preferences["theme"] {
    const THEME_INPUT = String(raw.theme ?? "").trim();
    if (isSupportedTheme(THEME_INPUT)) {
        return THEME_INPUT;
    }
    return DEFAULT_PREFERENCES.theme;
}

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
        theme: normalizedTheme(raw),
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
        gamificationEnabled: Boolean(raw.gamificationEnabled),
        recommendationsEnabled: shippedFeatureFlag(
            raw.recommendationsEnabled,
            RECOMMENDATIONS_AVAILABLE,
        ),
        socialEnabled: shippedFeatureFlag(
            raw.socialEnabled,
            SOCIAL_FEATURES_AVAILABLE,
        ),
    };
}
