import type { PlannerSettings } from "../app/types.js";
import { DEFAULT_DIFFICULTY_MULTIPLIER, DEFAULT_PLAN_MODE, weekdays } from "./config.js";
import { allFieldDefinitions, inputEl, numberLevels, selectEl } from "./field_io.js";

export function fillSettingsForm(
  settings: PlannerSettings,
  setDayOffs: (nextDayOffs: string[]) => void,
): void {
  allFieldDefinitions().forEach((field) => {
    const value = settings[field.id];
    if (field.type === "select") {
      let selectedValue = DEFAULT_PLAN_MODE;
      if (typeof value === "string" && value.trim()) {
        selectedValue = value;
      } else if (typeof value === "number") {
        if (Number.isFinite(value)) {
          selectedValue = `${value}`;
        }
      } else if (typeof value === "boolean") {
        if (value) {
          selectedValue = "true";
        } else {
          selectedValue = "false";
        }
      }
      selectEl(field.id).value = selectedValue;
      return;
    }
    let normalizedValue = "";
    if (typeof value === "string") {
      normalizedValue = value;
    } else if (typeof value === "number") {
      if (Number.isFinite(value)) {
        normalizedValue = `${value}`;
      }
    } else if (typeof value === "boolean") {
      if (value) {
        normalizedValue = "true";
      } else {
        normalizedValue = "false";
      }
    }
    inputEl(field.id).value = normalizedValue;
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
