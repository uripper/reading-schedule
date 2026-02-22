import type { PlannerSettings } from "../app/types.js";
import { DEFAULT_DIFFICULTY_MULTIPLIER, weekdays, type FieldDefinition } from "./config.js";
import { allFieldDefinitions, inputEl, numberLevels, selectEl } from "./field_io.js";

/**
 * Reads raw string value for a settings field from the DOM.
 * @param field Field definition.
 * @returns Trimmed field value text.
 */
function fieldInputValue(field: FieldDefinition): string {
  if (field.type === "select") {
    return selectEl(field.id).value.trim();
  }
  return inputEl(field.id).value.trim();
}

/**
 * Serializes settings form controls and derived values into planner settings.
 * @param dayOffs Current day-off weekday keys.
 * @returns Planner settings payload.
 */
export function collectSettingsForm(dayOffs: string[]): PlannerSettings {
  const output: PlannerSettings = {};
  allFieldDefinitions().forEach((field) => {
    const raw = fieldInputValue(field);
    if (field.type === "date" || field.type === "select") {
      output[field.id] = raw;
      return;
    }
    output[field.id] = Number(raw || 0);
  });
  const minutesPerDayRaw = inputEl("minutes_per_day").value.trim();
  output.minutes_per_day = null;
  if (minutesPerDayRaw) {
    output.minutes_per_day = Number(minutesPerDayRaw);
  }
  output.minutes_by_weekday = Object.fromEntries(
    weekdays.map(([key]) => [key, Number(inputEl(`minutes_${key}`).value || 0)]),
  );
  output.days_off = [...dayOffs];
  output.difficulty_multiplier = Object.fromEntries(
    numberLevels().map((level) => {
      const value = Number(
        inputEl(`diff_${level}`).value || DEFAULT_DIFFICULTY_MULTIPLIER,
      );
      return [String(level), value];
    }),
  );
  return output;
}
