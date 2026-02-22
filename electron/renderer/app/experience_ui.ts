import { el } from "../dom.js";
import {
  DEFAULT_PREFERENCES,
  type FeatureFlags,
  isSupportedTheme,
  type Preferences,
} from "./experience.js";
import {
  RECOMMENDATIONS_AVAILABLE,
  REMINDERS_AVAILABLE,
  SOCIAL_FEATURES_AVAILABLE,
  shippedFeatureFlag,
  shippedReminderTime,
} from "./experience_availability.js";

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
