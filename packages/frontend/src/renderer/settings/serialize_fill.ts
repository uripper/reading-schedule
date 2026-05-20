/**
 * Fills settings form controls from persisted planner settings.
 */
import type { PlannerSettings } from "../../types/types.ts";
import { WEEKDAYS } from "./config.ts";
import { DEFAULT_MINUTES_PER_DAY, DEFAULT_WPM_BASE } from "./defaults.ts";
import { allFieldDefinitions, inputEl, selectEl } from "./field_io.ts";

/**
 * Normalizes arbitrary settings value to text for form controls.
 * @param value - Raw settings value.
 * @returns String representation suitable for input/select values.
 */
function booleanSettingValueText(value: boolean): string {
    if (value) {
        return "true";
    }
    return "false";
}

function settingValueText(value: unknown): string {
    if (typeof value === "string") {
        return value;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
    }
    if (typeof value !== "boolean") {
        return "";
    }
    return booleanSettingValueText(value);
}

/**
 * Resolves select-field value using fallback default when empty.
 * @param value - Raw settings value.
 * @returns Select value text.
 */
function selectSettingValue(value: unknown): string {
    const NORMALIZED = settingValueText(value);
    if (NORMALIZED) {
        return NORMALIZED;
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

function normalizedDayOffs(settings: PlannerSettings): string[] {
    const NEXT_DAY_OFFS: string[] = [];
    const RAW_DAY_OFFS = settings.days_off;
    if (!Array.isArray(RAW_DAY_OFFS)) {
        return NEXT_DAY_OFFS;
    }
    for (const DAY_OFF of RAW_DAY_OFFS) {
        if (typeof DAY_OFF === "string") {
            NEXT_DAY_OFFS.push(DAY_OFF);
        }
    }
    NEXT_DAY_OFFS.sort((left, right) => left.localeCompare(right));
    return NEXT_DAY_OFFS;
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
    setDayOffs(normalizedDayOffs(settings));
}

/** Populates one rendered settings field from planner settings. */
function populateFieldValue(options: {
    fieldId: string;
    settings: PlannerSettings;
    type: ReturnType<typeof allFieldDefinitions>[number]["type"];
}): void {
    const VALUE = options.settings[options.fieldId];
    if (options.type === "select") {
        populateSelectField(options.fieldId, VALUE);
        return;
    }
    if (options.type === "checkbox") {
        populateCheckboxField(options.fieldId, VALUE);
        return;
    }
    inputEl(options.fieldId).value = settingFieldValueText(
        options.fieldId,
        VALUE,
    );
}

function populateSelectField(fieldId: string, value: unknown): void {
    selectEl(fieldId).value = selectSettingValue(value);
}

function populateCheckboxField(fieldId: string, value: unknown): void {
    inputEl(fieldId).checked = checkboxSettingValue(value);
}

function populateWeekdayMinutes(settings: PlannerSettings): void {
    const MINUTES_BY_WEEKDAY = settings.minutes_by_weekday ?? {};
    for (const [KEY] of WEEKDAYS) {
        const VALUE = MINUTES_BY_WEEKDAY[KEY];
        inputEl(`minutes_${KEY}`).value = settingValueText(VALUE);
    }
}

function settingFieldValueText(fieldId: string, value: unknown): string {
    if (fieldId === "minutes_per_day" && value === undefined) {
        return String(DEFAULT_MINUTES_PER_DAY);
    }
    if (fieldId === "wpm_base" && value === undefined) {
        return String(DEFAULT_WPM_BASE);
    }
    return settingValueText(value);
}

function populateSettingsFields(settings: PlannerSettings) {
    for (const FIELD of allFieldDefinitions()) {
        populateFieldValue({
            fieldId: FIELD.id,
            settings,
            type: FIELD.type,
        });
    }
    populateWeekdayMinutes(settings);
}
