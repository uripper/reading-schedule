import { el } from "../../dom.js";
import type { FeatureFlags, Preferences } from "./model.js";
import { DEFAULT_PREFERENCES } from "./model.js";
import {
  RECOMMENDATIONS_AVAILABLE,
  REMINDERS_AVAILABLE,
  SOCIAL_FEATURES_AVAILABLE,
  shippedFeatureFlag,
  shippedReminderTime,
} from "./availability.js";

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
