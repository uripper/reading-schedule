import type { FieldDefinition, PlannerSettings } from "../../types/types.js";
import { DEFAULT_DIFFICULTY_MULTIPLIER, WEEKDAYS } from "./config.js";
import {
    allFieldDefinitions,
    inputEl,
    numberLevels,
    selectEl,
} from "./field_io.js";

/**
 * Reads raw string value for a settings field from the DOM.
 * @param field Field definition.
 * @returns Trimmed field value text.
 */
function fieldInputValue(field: FieldDefinition): string {
    if (field.type === "select") {
        return selectEl(field.id).value.trim();
    }
    if (field.type === "checkbox") {
        if (inputEl(field.id).checked) {
            return "true";
        }
        return "false";
    }
    return inputEl(field.id).value.trim();
}

/**
 * Serializes settings form controls and derived values into planner settings.
 * @param dayOffs Current day-off weekday keys.
 * @returns Planner settings payload.
 */
export function collectSettingsForm(dayOffs: string[]): PlannerSettings {
    const OUTPUT: PlannerSettings = {};

    for (const FIELD of allFieldDefinitions()) {
        const RAW = fieldInputValue(FIELD);
        if (FIELD.type === "checkbox") {
            OUTPUT[FIELD.id] = RAW === "true";
            continue;
        }
        if (FIELD.type === "date" || FIELD.type === "select") {
            OUTPUT[FIELD.id] = RAW;
            continue;
        }
        OUTPUT[FIELD.id] = Number(RAW || 0);
    }
    
    const MINUTES_PER_DAY_RAW = inputEl("minutes_per_day").value.trim();
    OUTPUT.minutes_per_day = null;
    if (MINUTES_PER_DAY_RAW) {
        OUTPUT.minutes_per_day = Number(MINUTES_PER_DAY_RAW);
    }
    OUTPUT.minutes_by_weekday = Object.fromEntries(
        WEEKDAYS.map(([key]) => [
            key,
            Number(inputEl(`minutes_${key}`).value || 0),
        ]),
    );
    OUTPUT.days_off = [...dayOffs];
    OUTPUT.difficulty_multiplier = Object.fromEntries(
        numberLevels().map((level) => {
            const VALUE = Number(
                inputEl(`diff_${level}`).value || DEFAULT_DIFFICULTY_MULTIPLIER,
            );
            return [String(level), VALUE];
        }),
    );
    return OUTPUT;
}
