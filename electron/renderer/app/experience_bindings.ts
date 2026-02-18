// @ts-nocheck
import { el } from "../dom.js";

const EXPERIENCE_SETTING_IDS = [
  "themeSelect",
  "reduceMotionToggle",
  "dailyGoalInput",
  "reminderEnabledToggle",
  "reminderTimeInput",
  "flagGamification",
  "flagSocial",
  "flagRecommendations",
];

export function bindExperienceSettings(onApplySettings) {
  EXPERIENCE_SETTING_IDS.forEach((id) => {
    const node = el(id);
    node.addEventListener("change", onApplySettings);
  });
}
