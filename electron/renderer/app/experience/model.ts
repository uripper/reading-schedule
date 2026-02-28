import {
    type FeatureFlags,
    type FeatureFlagsInput,
    type Preferences,
    type PreferencesInput,
} from "../../../types/types.js";
import {
    RECOMMENDATIONS_AVAILABLE,
    REMINDERS_AVAILABLE,
    SOCIAL_FEATURES_AVAILABLE,
    shippedFeatureFlag,
    shippedReminderTime,
} from "./availability.js";

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

/**
 * Normalize user preferences from raw input, applying defaults and handling feature availability.
 * @param raw - The raw input object containing user preferences, which may be incomplete
 * or have different naming conventions.
 * @returns A fully normalized Preferences object with all necessary fields and default values applied.
 */
export function normalizePreferences(raw: PreferencesInput = {}): Preferences {
    let theme: Preferences["theme"] = DEFAULT_PREFERENCES.theme;
    const themeInput = String(raw.theme ?? "").trim();
    if (isSupportedTheme(themeInput)) {
        theme = themeInput;
    }

    const dailyGoalRaw =
        raw.dailyGoalMinutes ??
        raw.daily_goal_minutes ??
        DEFAULT_PREFERENCES.dailyGoalMinutes;
    const dailyGoalMinutes = Number(dailyGoalRaw);
    let normalizedDailyGoalMinutes = DEFAULT_PREFERENCES.dailyGoalMinutes;
    if (Number.isFinite(dailyGoalMinutes) && dailyGoalMinutes > 0) {
        normalizedDailyGoalMinutes = Math.round(dailyGoalMinutes);
    }

    return {
        dailyGoalMinutes: normalizedDailyGoalMinutes,
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
        theme,
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
