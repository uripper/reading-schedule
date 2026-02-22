import { el } from "../dom.js";
import {
  RECOMMENDATIONS_AVAILABLE,
  REMINDERS_AVAILABLE,
  SOCIAL_FEATURES_AVAILABLE,
  shippedFeatureFlag,
  shippedReminderTime,
} from "./experience_availability.js";
export type Preferences = {
  theme: "system" | "light" | "dark";
  reduceMotion: boolean;
  timezone: string;
  dailyGoalMinutes: number;
  reminderEnabled: boolean;
  reminderTime: string;
};

export type FeatureFlags = {
  gamificationEnabled: boolean;
  socialEnabled: boolean;
  recommendationsEnabled: boolean;
};

type PreferencesInput = Partial<Preferences> & {
  daily_goal_minutes?: number | string;
};

type FeatureFlagsInput = Partial<FeatureFlags>;

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
  reduceMotion: false,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  dailyGoalMinutes: 30,
  reminderEnabled: false,
  reminderTime: "20:00",
};

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  gamificationEnabled: false,
  socialEnabled: false,
  recommendationsEnabled: false,
};

function isSupportedTheme(value: string): value is Preferences["theme"] {
  return value === "system" || value === "light" || value === "dark";
}

function numberInputValue(id: string): number {
  const raw = el<HTMLInputElement>(id).value;
  return Number(raw || 0);
}

function checkboxValue(id: string): boolean {
  return el<HTMLInputElement>(id).checked;
}

function inputValue(id: string): string {
  return el<HTMLInputElement>(id).value;
}

function selectValue(id: string): string {
  return el<HTMLSelectElement>(id).value;
}

export function normalizePreferences(raw: PreferencesInput = {}): Preferences {
  let theme: Preferences["theme"] = DEFAULT_PREFERENCES.theme;
  const themeInput = String(raw.theme || "").trim();
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
    timezone: String(raw.timezone || DEFAULT_PREFERENCES.timezone),
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

export function normalizeScheduleCompletions(
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

export function collectPreferencesFromUI(): Preferences {
  let theme: Preferences["theme"] = DEFAULT_PREFERENCES.theme;
  const selectedTheme = selectValue("themeSelect");
  if (isSupportedTheme(selectedTheme)) {
    theme = selectedTheme;
  }

  return {
    theme,
    reduceMotion: checkboxValue("reduceMotionToggle"),
    timezone: DEFAULT_PREFERENCES.timezone,
    dailyGoalMinutes:
      numberInputValue("dailyGoalInput") ||
      DEFAULT_PREFERENCES.dailyGoalMinutes,
    reminderEnabled: shippedFeatureFlag(
      checkboxValue("reminderEnabledToggle"),
      REMINDERS_AVAILABLE,
    ),
    reminderTime: shippedReminderTime(
      inputValue("reminderTimeInput"),
      REMINDERS_AVAILABLE,
      DEFAULT_PREFERENCES.reminderTime,
    ),
  };
}

export function collectFeatureFlagsFromUI(): FeatureFlags {
  return {
    gamificationEnabled: checkboxValue("flagGamification"),
    socialEnabled: shippedFeatureFlag(
      checkboxValue("flagSocial"),
      SOCIAL_FEATURES_AVAILABLE,
    ),
    recommendationsEnabled: shippedFeatureFlag(
      checkboxValue("flagRecommendations"),
      RECOMMENDATIONS_AVAILABLE,
    ),
  };
}

export function fillPreferencesUI(
  preferences: Preferences,
  featureFlags: FeatureFlags,
): void {
  el<HTMLSelectElement>("themeSelect").value = preferences.theme;
  el<HTMLInputElement>("reduceMotionToggle").checked = Boolean(
    preferences.reduceMotion,
  );
  el<HTMLInputElement>("dailyGoalInput").value = String(
    preferences.dailyGoalMinutes || DEFAULT_PREFERENCES.dailyGoalMinutes,
  );
  el<HTMLInputElement>("reminderEnabledToggle").checked = shippedFeatureFlag(
    preferences.reminderEnabled,
    REMINDERS_AVAILABLE,
  );
  el<HTMLInputElement>("reminderTimeInput").value = shippedReminderTime(
    preferences.reminderTime,
    REMINDERS_AVAILABLE,
    DEFAULT_PREFERENCES.reminderTime,
  );
  el<HTMLInputElement>("flagGamification").checked = Boolean(
    featureFlags.gamificationEnabled,
  );
  el<HTMLInputElement>("flagSocial").checked = shippedFeatureFlag(
    featureFlags.socialEnabled,
    SOCIAL_FEATURES_AVAILABLE,
  );
  el<HTMLInputElement>("flagRecommendations").checked = shippedFeatureFlag(
    featureFlags.recommendationsEnabled,
    RECOMMENDATIONS_AVAILABLE,
  );
}
