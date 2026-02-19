// @ts-nocheck

import { el } from "../dom.js";

export const DEFAULT_PREFERENCES = {
  theme: "system",
  reduceMotion: false,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  dailyGoalMinutes: 30,
  reminderEnabled: false,
  reminderTime: "20:00",
};

export const DEFAULT_FEATURE_FLAGS = {
  gamificationEnabled: false,
  socialEnabled: false,
  recommendationsEnabled: false,
};

export function normalizePreferences(raw = {}) {
  let { theme } = DEFAULT_PREFERENCES;
  if (["system", "light", "dark"].includes(raw.theme)) {
    theme = raw.theme;
  }

  const dailyGoalMinutes = Number(raw.dailyGoalMinutes || raw.daily_goal_minutes || DEFAULT_PREFERENCES.dailyGoalMinutes);
  let normalizedDailyGoalMinutes = DEFAULT_PREFERENCES.dailyGoalMinutes;
  if (Number.isFinite(dailyGoalMinutes) && dailyGoalMinutes > 0) {
    normalizedDailyGoalMinutes = Math.round(dailyGoalMinutes);
  }

  return {
    theme,
    reduceMotion: Boolean(raw.reduceMotion),
    timezone: String(raw.timezone || DEFAULT_PREFERENCES.timezone),
    dailyGoalMinutes: normalizedDailyGoalMinutes,
    reminderEnabled: Boolean(raw.reminderEnabled),
    reminderTime: String(raw.reminderTime || DEFAULT_PREFERENCES.reminderTime),
  };
}

export function normalizeFeatureFlags(raw = {}) {
  return {
    gamificationEnabled: Boolean(raw.gamificationEnabled),
    socialEnabled: Boolean(raw.socialEnabled),
    recommendationsEnabled: Boolean(raw.recommendationsEnabled),
  };
}

export function normalizeScheduleCompletions(raw = {}) {
  const out = {};
  Object.entries(raw || {}).forEach(([key, value]) => {
    if (!key) {
      return;
    }
    out[key] = Boolean(value);
  });
  return out;
}

export function collectPreferencesFromUI() {
  return {
    theme: el("themeSelect").value,
    reduceMotion: el("reduceMotionToggle").checked,
    timezone: DEFAULT_PREFERENCES.timezone,
    dailyGoalMinutes: Number(el("dailyGoalInput").value || DEFAULT_PREFERENCES.dailyGoalMinutes),
    reminderEnabled: el("reminderEnabledToggle").checked,
    reminderTime: el("reminderTimeInput").value || DEFAULT_PREFERENCES.reminderTime,
  };
}

export function collectFeatureFlagsFromUI() {
  return {
    gamificationEnabled: el("flagGamification").checked,
    socialEnabled: el("flagSocial").checked,
    recommendationsEnabled: el("flagRecommendations").checked,
  };
}

export function fillPreferencesUI(preferences, featureFlags) {
  el("themeSelect").value = preferences.theme;
  el("reduceMotionToggle").checked = Boolean(preferences.reduceMotion);
  el("dailyGoalInput").value = String(preferences.dailyGoalMinutes || DEFAULT_PREFERENCES.dailyGoalMinutes);
  el("reminderEnabledToggle").checked = Boolean(preferences.reminderEnabled);
  el("reminderTimeInput").value = preferences.reminderTime || DEFAULT_PREFERENCES.reminderTime;
  el("flagGamification").checked = Boolean(featureFlags.gamificationEnabled);
  el("flagSocial").checked = Boolean(featureFlags.socialEnabled);
  el("flagRecommendations").checked = Boolean(featureFlags.recommendationsEnabled);
}
