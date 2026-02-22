import type { PlannerSettings } from "../app/types.js";
import { DEFAULT_DIFFICULTY_MULTIPLIER, DEFAULT_PLAN_MODE, weekdays } from "./config.js";
import { allFieldDefinitions, inputEl, numberLevels, selectEl } from "./field_io.js";

/**
 *
 * @param value
 */
function settingValueText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value}`;
  }
  if (typeof value === "boolean") {
    if (value) {
      return "true";
    }
    return "false";
  }
  return "";
}

/**
 *
 * @param value
 */
function selectSettingValue(value: unknown): string {
  const normalized = settingValueText(value);
  if (normalized) {
    return normalized;
  }
  return DEFAULT_PLAN_MODE;
}

/**
 *
 * @param settings
 * @param setDayOffs
 */
export function fillSettingsForm(
  settings: PlannerSettings,
  setDayOffs: (nextDayOffs: string[]) => void,
): void {
  allFieldDefinitions().forEach((field) => {
    const value = settings[field.id];
    if (field.type === "select") {
      selectEl(field.id).value = selectSettingValue(value);
      return;
    }
    inputEl(field.id).value = settingValueText(value);
  });
  const minutesByWeekday = settings.minutes_by_weekday || {};
  weekdays.forEach(([key]) => {
    inputEl(`minutes_${key}`).value = String(minutesByWeekday[key] ?? 0);
  });
  const rawDayOffs = settings.days_off;
  const nextDayOffs: string[] = [];
  if (Array.isArray(rawDayOffs)) {
    rawDayOffs.forEach((dayOff) => {
      if (typeof dayOff === "string") {
        nextDayOffs.push(dayOff);
      }
    });
  }
  nextDayOffs.sort((left, right) => left.localeCompare(right));
  setDayOffs(nextDayOffs);
  const difficultyMultiplier = settings.difficulty_multiplier || {};
  numberLevels().forEach((level) => {
    const id = `diff_${level}`;
    const exactLevel = difficultyMultiplier[level];
    const stringLevel = difficultyMultiplier[String(level)];
    const value = exactLevel ?? stringLevel ?? DEFAULT_DIFFICULTY_MULTIPLIER;
    inputEl(id).value = String(value);
  });
}
