/**
 * Serializes settings form state into planner settings payloads.
 */
import type { FieldDefinition, PlannerSettings } from "../../types/types.ts";
import { WEEKDAYS } from "./config.ts";
import {
    automaticPlannerEndDate,
    DEFAULT_MAX_BLOCKS_PER_BOOK_PER_DAY,
    DEFAULT_MAX_BOOKS_PER_DAY,
    DEFAULT_MINUTES_PER_DAY,
    DEFAULT_PLAN_MODE,
    DEFAULT_TIME_QUANTUM_MINUTES,
    DEFAULT_WPM_BASE,
} from "./defaults.ts";
import { allFieldDefinitions, inputEl, selectEl } from "./field_io.ts";
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

function positiveWeekdayMinutes(key: string): number | null {
    const VALUE = Number(inputEl(`minutes_${key}`).value || 0);
    if (!Number.isFinite(VALUE) || VALUE <= 0) {
        return null;
    }
    return Math.round(VALUE);
}

function weekdayMinutesByDay(): Record<string, number> {
    const MINUTES_BY_WEEKDAY: Record<string, number> = {};
    for (const [KEY] of WEEKDAYS) {
        const MINUTES = positiveWeekdayMinutes(KEY);
        if (MINUTES === null) {
            continue;
        }
        MINUTES_BY_WEEKDAY[KEY] = MINUTES;
    }
    return MINUTES_BY_WEEKDAY;
}

function normalizedMaxBooksPerDay(settings: PlannerSettings): number {
    const VALUE = Number(
        settings.max_books_per_day ?? DEFAULT_MAX_BOOKS_PER_DAY,
    );
    if (!Number.isFinite(VALUE) || VALUE <= 0) {
        return DEFAULT_MAX_BOOKS_PER_DAY;
    }
    return Math.round(VALUE);
}

function applyHiddenPlannerDefaults(settings: PlannerSettings): void {
    const SETTINGS = settings;
    const START_DATE = normalizePlannerStartDate(SETTINGS.start_date);
    const MAX_BOOKS_PER_DAY = normalizedMaxBooksPerDay(SETTINGS);
    SETTINGS.end_date = automaticPlannerEndDate(START_DATE);
    SETTINGS.max_blocks_per_book_per_day = DEFAULT_MAX_BLOCKS_PER_BOOK_PER_DAY;
    SETTINGS.max_books_per_day = MAX_BOOKS_PER_DAY;
    SETTINGS.max_sessions_per_day = MAX_BOOKS_PER_DAY;
    SETTINGS.minutes_per_day =
        clampedOptionalNumber("minutes_per_day") ?? DEFAULT_MINUTES_PER_DAY;
    SETTINGS.plan_mode = DEFAULT_PLAN_MODE;
    SETTINGS.start_date = START_DATE;
    SETTINGS.time_quantum_minutes = DEFAULT_TIME_QUANTUM_MINUTES;
    SETTINGS.wpm_base = clampedOptionalNumber("wpm_base") ?? DEFAULT_WPM_BASE;
}

/**
 * Serializes settings form controls and derived values into planner settings.
 * @param dayOffs - Current day-off weekday keys.
 * @returns Planner settings payload.
 */
export function collectSettingsForm(dayOffs: string[]): PlannerSettings {
    const OUTPUT = collectFieldSettings();
    OUTPUT.minutes_by_weekday = weekdayMinutesByDay();
    OUTPUT.days_off = [...dayOffs];
    applyHiddenPlannerDefaults(OUTPUT);
    return OUTPUT;
}
