import { el } from "../../dom.js";
import {
  DEFAULT_PREFERENCES,
  type FeatureFlags,
  isSupportedTheme,
  type Preferences,
} from "./model.js";
import {
  RECOMMENDATIONS_AVAILABLE,
  REMINDERS_AVAILABLE,
  SOCIAL_FEATURES_AVAILABLE,
  shippedFeatureFlag,
  shippedReminderTime,
} from "./availability.js";

/**
 * Get the numeric value from an input element.
 * @param id The ID of the input element.
 * @returns The numeric value of the input, or 0 if the input is empty or invalid.
 */
function numberInputValue(id: string): number {
  const raw = el<HTMLInputElement>(id).value;
  return Number(raw || 0);
}

/**
 * Get the boolean value from a checkbox input element.
 * @param id The ID of the checkbox input element.
 * @returns The boolean value of the checkbox input.
 */
function checkboxValue(id: string): boolean {
  return el<HTMLInputElement>(id).checked;
}

/**
 * Get the string value from an input element.
 * @param id The ID of the input element.
 * @returns The string value of the input.
 */
function inputValue(id: string): string {
  return el<HTMLInputElement>(id).value;
}

/**
 * Get the selected value from a select element.
 * @param id The ID of the select element.
 * @returns The selected value of the select element.
 */
function selectValue(id: string): string {
  return el<HTMLSelectElement>(id).value;
}

/**
 * Collect user preferences from the UI elements.
 * @returns An object containing the user preferences.
 */
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

/**
 * Collect feature flag settings from the UI elements.
 * @returns An object containing the feature flag settings.
 */
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
