import {
  RECOMMENDATIONS_AVAILABLE,
  REMINDERS_AVAILABLE,
  SOCIAL_FEATURES_AVAILABLE,
  shippedFeatureFlag,
  shippedReminderTime,
} from "./availability.js";
export interface Preferences {
  theme: "system" | "light" | "dark";
  reduceMotion: boolean;
  timezone: string;
  dailyGoalMinutes: number;
  reminderEnabled: boolean;
  reminderTime: string;
}

export interface FeatureFlags {
  gamificationEnabled: boolean;
  socialEnabled: boolean;
  recommendationsEnabled: boolean;
}

type PreferencesInput = Partial<Preferences> & {
  daily_goal_minutes?: number | string;
};

type FeatureFlagsInput = Partial<FeatureFlags>;

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
  reduceMotion: false,
  timezone: new Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  dailyGoalMinutes: 30,
  reminderEnabled: false,
  reminderTime: "20:00",
};

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  gamificationEnabled: false,
  socialEnabled: false,
  recommendationsEnabled: false,
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
    theme,
    reduceMotion: Boolean(raw.reduceMotion),
    timezone: String(raw.timezone ?? DEFAULT_PREFERENCES.timezone),
    dailyGoalMinutes: normalizedDailyGoalMinutes,
    reminderEnabled: shippedFeatureFlag(
      raw.reminderEnabled,
      REMINDERS_AVAILABLE,
    ),
    reminderTime: shippedReminderTime(
      raw.reminderTime,
      REMINDERS_AVAILABLE,
      DEFAULT_PREFERENCES.reminderTime,
    ),
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
    socialEnabled: shippedFeatureFlag(
      raw.socialEnabled,
      SOCIAL_FEATURES_AVAILABLE,
    ),
    recommendationsEnabled: shippedFeatureFlag(
      raw.recommendationsEnabled,
      RECOMMENDATIONS_AVAILABLE,
    ),
  };
}
