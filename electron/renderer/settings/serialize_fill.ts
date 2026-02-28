import { type PlannerSettings } from "../../types/types.js";
import {
    DEFAULT_DIFFICULTY_MULTIPLIER,
    DEFAULT_PLAN_MODE,
    weekdays,
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
function selectSettingValue(value: unknown): string {
    const normalized = settingValueText(value);
    if (normalized) {
        return normalized;
    }
    return DEFAULT_PLAN_MODE;
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
        const value = settings[field.id];
        if (field.type === "select") {
            selectEl(field.id).value = selectSettingValue(value);
            return;
        }
        if (field.type === "checkbox") {
            inputEl(field.id).checked = checkboxSettingValue(value);
            return;
        }
        inputEl(field.id).value = settingValueText(value);
    });
    const minutesByWeekday = settings.minutes_by_weekday ?? {};
    weekdays.forEach(([key]) => {
        inputEl(`minutes_${key}`).value = String(minutesByWeekday[key]);
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
    const difficultyMultiplier = settings.difficulty_multiplier ?? {};
    numberLevels().forEach((level) => {
        const id = `diff_${level}`;
        const difficultyKey = String(level);
        let value = DEFAULT_DIFFICULTY_MULTIPLIER;
        if (Object.hasOwn(difficultyMultiplier, difficultyKey)) {
            value = difficultyMultiplier[difficultyKey];
        }
        inputEl(id).value = String(value);
    });
}
