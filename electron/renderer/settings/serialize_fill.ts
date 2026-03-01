import { type PlannerSettings } from "../../types/types.js";
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
 * @param value Raw settings value.
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
 * @param value Raw settings value.
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
 * @param value Raw settings value.
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
 * @param settings Planner settings payload.
 * @param setDayOffs Setter used to update day-off chips/state.
 */
export function fillSettingsForm(
    settings: PlannerSettings,
    setDayOffs: (nextDayOffs: string[]) => void,
): void {
    allFieldDefinitions().forEach((field) => {
        const VALUE = settings[field.id];
        if (field.type === "select") {
            selectEl(field.id).value = selectSettingValue(field.id, VALUE);
            return;
        }
        if (field.type === "checkbox") {
            inputEl(field.id).checked = checkboxSettingValue(VALUE);
            return;
        }
        inputEl(field.id).value = settingValueText(VALUE);
    });
    const MINUTES_BY_WEEKDAY = settings.minutes_by_weekday ?? {};
    WEEKDAYS.forEach(([key]) => {
        inputEl(`minutes_${key}`).value = String(MINUTES_BY_WEEKDAY[key]);
    });
    const RAW_DAY_OFFS = settings.days_off;
    const NEXT_DAY_OFFS: string[] = [];
    if (Array.isArray(RAW_DAY_OFFS)) {
        RAW_DAY_OFFS.forEach((dayOff) => {
            if (typeof dayOff === "string") {
                NEXT_DAY_OFFS.push(dayOff);
            }
        });
    }
    NEXT_DAY_OFFS.sort((left, right) => left.localeCompare(right));
    setDayOffs(NEXT_DAY_OFFS);
    const DIFFICULTY_MULTIPLIER = settings.difficulty_multiplier ?? {};
    numberLevels().forEach((level) => {
        const ID = `diff_${level}`;
        const DIFFICULTY_KEY = String(level);
        let value = DEFAULT_DIFFICULTY_MULTIPLIER;
        if (Object.hasOwn(DIFFICULTY_MULTIPLIER, DIFFICULTY_KEY)) {
            value = DIFFICULTY_MULTIPLIER[DIFFICULTY_KEY];
        }
        inputEl(ID).value = String(value);
    });
}
