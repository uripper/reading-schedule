import type { PlannerSettings } from "../../types/types.js";
import {
    DEFAULT_DIFFICULTY_MULTIPLIER,
    DEFAULT_PLAN_MODE,
    DEFAULT_SOLVER_PROFILE,
    WEEKDAYS,
} from "./config.js";
import {
    allFieldDefinitions,
    inputEl,
    numberLevels,
    selectEl,
} from "./field_io.js";

/**
 * Normalizes arbitrary settings value to text for form controls.
 * @param value - Raw settings value.
 * @returns String representation suitable for input/select values.
 */
function settingValueText(value: unknown): string {
    if (typeof value === "string") {
        return value;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
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
 * Resolves select-field value using fallback default when empty.
 * @param fieldId - The ID of the field.
 * @param value - Raw settings value.
 * @returns Select value text.
 */
function selectSettingValue(fieldId: string, value: unknown): string {
    const NORMALIZED = settingValueText(value);
    if (NORMALIZED) {
        return NORMALIZED;
    }
    if (fieldId === "plan_mode") {
        return DEFAULT_PLAN_MODE;
    }
    if (fieldId === "planner_solver_profile") {
        return DEFAULT_SOLVER_PROFILE;
    }
    return "";
}

/**
 * Resolves boolean setting values with support for string payload variants.
 * @param value - Raw settings value.
 * @returns Boolean value for checkbox controls.
 */
function checkboxSettingValue(value: unknown): boolean {
    if (value === false || value === "false") {
        return false;
    }
    return true;
}

/**
 * Populates settings form controls from planner settings payload.
 * @param settings - Planner settings payload.
 * @param setDayOffs - Setter used to update day-off chips/state.
 */
export function fillSettingsForm(
    settings: PlannerSettings,
    setDayOffs: (nextDayOffs: string[]) => void,
): void {
    populateSettingsFields(settings);

    const RAW_DAY_OFFS = settings.days_off;
    const NEXT_DAY_OFFS: string[] = [];
    if (Array.isArray(RAW_DAY_OFFS)) {
        for (const DAY_OFF of RAW_DAY_OFFS) {
            if (typeof DAY_OFF === "string") {
                NEXT_DAY_OFFS.push(DAY_OFF);
            }
        }
    }
    NEXT_DAY_OFFS.sort((left, right) => left.localeCompare(right));
    setDayOffs(NEXT_DAY_OFFS);
    const DIFFICULTY_MULTIPLIER = settings.difficulty_multiplier ?? {};

    for (const LEVEL of numberLevels()) {
        const ID = `diff_${LEVEL}`;
        const DIFFICULTY_KEY = String(LEVEL);
        let value = DEFAULT_DIFFICULTY_MULTIPLIER;
        if (Object.hasOwn(DIFFICULTY_MULTIPLIER, DIFFICULTY_KEY)) {
            value = DIFFICULTY_MULTIPLIER[DIFFICULTY_KEY];
        }
        inputEl(ID).value = String(value);
    }
}

function populateSettingsFields(settings: PlannerSettings) {
    for (const FIELD of allFieldDefinitions()) {
        const VALUE = settings[FIELD.id];
        if (FIELD.type === "select") {
            selectEl(FIELD.id).value = selectSettingValue(FIELD.id, VALUE);
            continue;
        }
        if (FIELD.type === "checkbox") {
            inputEl(FIELD.id).checked = checkboxSettingValue(VALUE);
            continue;
        }
        inputEl(FIELD.id).value = settingValueText(VALUE);
    }

    const MINUTES_BY_WEEKDAY = settings.minutes_by_weekday ?? {};

    for (const [KEY] of WEEKDAYS) {
        inputEl(`minutes_${KEY}`).value = String(MINUTES_BY_WEEKDAY[KEY]);
    }
}
