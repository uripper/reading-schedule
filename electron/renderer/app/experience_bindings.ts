
import { el } from "../dom.js";

const EXPERIENCE_SETTING_IDS: readonly string[] = [
  "themeSelect",
  "reduceMotionToggle",
  "dailyGoalInput",
  "reminderEnabledToggle",
  "reminderTimeInput",
  "flagGamification",
  "flagSocial",
  "flagRecommendations",
];

type ExperienceSettingsApplyHandler = (event: Event) => void;

export function bindExperienceSettings(
  onApplySettings: ExperienceSettingsApplyHandler,
): void {
  EXPERIENCE_SETTING_IDS.forEach((id) => {
    const node = el(id);
    node.addEventListener("change", onApplySettings);
  });
}
