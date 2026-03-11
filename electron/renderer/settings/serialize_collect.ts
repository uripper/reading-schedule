/**
 * Serializes settings form state into planner settings payloads.
 */
import type { FieldDefinition, PlannerSettings } from "../../types/types.js";
import { DEFAULT_DIFFICULTY_MULTIPLIER, WEEKDAYS } from "./config.js";
import {
    allFieldDefinitions,
    inputEl,
    numberLevels,
    selectEl,
} from "./field_io.js";
import { normalizePlannerStartDate } from "./start_date.js";

/**
 * Reads raw string value for a settings field from the DOM.
 * @param field - Field definition.
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
 * Clamps a numeric input value to the input element's HTML min/max bounds.
 * @param inputId - Input element id.
 * @returns Rounded and clamped number, or null when blank.
 */
function clampedOptionalNumber(inputId: string): number | null {
    const INPUT = inputEl(inputId);
    const RAW = INPUT.value.trim();
    if (RAW === "") {
        return null;
    }

    let value = Math.round(Number(RAW));
    if (Number.isNaN(value)) {
        value = 0;
    }
    if (INPUT.min !== "") {
        const MIN = Number(INPUT.min);
        if (value < MIN) {
            value = MIN;
        }
    }
    if (INPUT.max !== "") {
        const MAX = Number(INPUT.max);
        if (value > MAX) {
            value = MAX;
        }
    }
    return value;
}

/**
 * Serializes settings form controls and derived values into planner settings.
 * @param dayOffs - Current day-off weekday keys.
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
        if (FIELD.type === "date") {
            if (FIELD.id === "start_date") {
                OUTPUT[FIELD.id] = normalizePlannerStartDate(RAW);
                continue;
            }
            OUTPUT[FIELD.id] = RAW;
            continue;
        }
        if (FIELD.type === "select") {
            OUTPUT[FIELD.id] = RAW;
            continue;
        }
        OUTPUT[FIELD.id] = Number(RAW || 0);
    }

    OUTPUT.minutes_per_day = clampedOptionalNumber("minutes_per_day");
    OUTPUT.minutes_by_weekday = Object.fromEntries(
        WEEKDAYS.map(([key]) => {
            return [key, Number(inputEl(`minutes_${key}`).value || 0)];
        }),
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
