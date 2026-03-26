/**
 * Serializes settings form state into planner settings payloads.
 */
import type { FieldDefinition, PlannerSettings } from "../../types/types.ts";
import { DEFAULT_DIFFICULTY_MULTIPLIER, WEEKDAYS } from "./config.ts";
import {
    allFieldDefinitions,
    inputEl,
    numberLevels,
    selectEl,
} from "./field_io.ts";
import { normalizePlannerStartDate } from "./start_date.ts";

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

function roundedNumber(raw: string): number {
    const VALUE = Math.round(Number(raw));
    if (Number.isNaN(VALUE)) {
        return 0;
    }
    return VALUE;
}

function minClampedValue(input: HTMLInputElement, value: number): number {
    if (input.min === "") {
        return value;
    }
    const MIN = Number(input.min);
    if (value < MIN) {
        return MIN;
    }
    return value;
}

function maxClampedValue(input: HTMLInputElement, value: number): number {
    if (input.max === "") {
        return value;
    }
    const MAX = Number(input.max);
    if (value > MAX) {
        return MAX;
    }
    return value;
}

function clampToInputBounds(input: HTMLInputElement, value: number): number {
    return maxClampedValue(input, minClampedValue(input, value));
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
    return clampToInputBounds(INPUT, roundedNumber(RAW));
}

function normalizedDateSetting(field: FieldDefinition, raw: string): string {
    if (field.id === "start_date") {
        return normalizePlannerStartDate(raw);
    }
    return raw;
}

function serializedFieldValue(
    field: FieldDefinition,
    raw: string,
): boolean | number | string {
    if (field.type === "checkbox") {
        return raw === "true";
    }
    if (field.type === "date") {
        return normalizedDateSetting(field, raw);
    }
    if (field.type === "select") {
        return raw;
    }
    return Number(raw || 0);
}

function collectFieldSettings(): PlannerSettings {
    const OUTPUT: PlannerSettings = {};
    for (const FIELD of allFieldDefinitions()) {
        OUTPUT[FIELD.id] = serializedFieldValue(FIELD, fieldInputValue(FIELD));
    }
    return OUTPUT;
}

function weekdayMinutesByDay(): Record<string, number> {
    return Object.fromEntries(
        WEEKDAYS.map(([key]) => {
            return [key, Number(inputEl(`minutes_${key}`).value || 0)];
        }),
    );
}

function difficultyMultipliersByLevel(): Record<string, number> {
    return Object.fromEntries(
        numberLevels().map((level) => {
            const VALUE = Number(
                inputEl(`diff_${level}`).value || DEFAULT_DIFFICULTY_MULTIPLIER,
            );
            return [String(level), VALUE];
        }),
    );
}

/**
 * Serializes settings form controls and derived values into planner settings.
 * @param dayOffs - Current day-off weekday keys.
 * @returns Planner settings payload.
 */
export function collectSettingsForm(dayOffs: string[]): PlannerSettings {
    const OUTPUT = collectFieldSettings();
    OUTPUT.minutes_per_day = clampedOptionalNumber("minutes_per_day");
    OUTPUT.minutes_by_weekday = weekdayMinutesByDay();
    OUTPUT.days_off = [...dayOffs];
    OUTPUT.difficulty_multiplier = difficultyMultipliersByLevel();
    return OUTPUT;
}
