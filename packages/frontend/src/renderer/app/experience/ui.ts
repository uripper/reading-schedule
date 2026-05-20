import type { FeatureFlags, Preferences } from "../../../types/types.ts";
import { el } from "../../dom.ts";
import {
    REMINDERS_AVAILABLE,
    shippedFeatureFlag,
    shippedReminderTime,
} from "./availability.ts";
import {
    DEFAULT_FEATURE_FLAGS,
    DEFAULT_PREFERENCES,
    isSupportedTheme,
} from "./model.ts";

/**
 * Reads a numeric input and normalizes empty or invalid values to 0.
 * @param id - Input element id.
 * @returns Parsed number, or 0 when input is empty/invalid.
 */
function numberInputValue(id: string): number {
    const RAW = el<HTMLInputElement>(id).value;
    const PARSED = Number(RAW);
    if (Number.isFinite(PARSED)) {
        return PARSED;
    }
    return 0;
}

/**
 * Reads checkbox state as a boolean.
 * @param id - Checkbox element id.
 * @returns Checked state.
 */
function checkboxValue(id: string): boolean {
    return el<HTMLInputElement>(id).checked;
}

/**
 * Reads text-like input value.
 * @param id - Input element id.
 * @returns Raw input value.
 */
function inputValue(id: string): string {
    return el<HTMLInputElement>(id).value;
}

/**
 * Reads the current selected option value.
 * @param id - Select element id.
 * @returns Selected option value.
 */
function selectValue(id: string): string {
    return el<HTMLSelectElement>(id).value;
}

function selectedTheme(): Preferences["theme"] {
    const SELECTED_THEME = selectValue("themeSelect");
    if (isSupportedTheme(SELECTED_THEME)) {
        return SELECTED_THEME;
    }
    return DEFAULT_PREFERENCES.theme;
}

function dailyGoalMinutesPreference(): number {
    return (
        numberInputValue("dailyGoalInput") ||
        DEFAULT_PREFERENCES.dailyGoalMinutes
    );
}

/**
 * Collect user preferences from the UI elements.
 * @returns An object containing the user preferences.
 */
export function collectPreferencesFromUI(): Preferences {
    return {
        dailyGoalMinutes: dailyGoalMinutesPreference(),
        reduceMotion: checkboxValue("reduceMotionToggle"),
        reminderEnabled: shippedFeatureFlag(
            checkboxValue("reminderEnabledToggle"),
            REMINDERS_AVAILABLE,
        ),
        reminderTime: shippedReminderTime(
            inputValue("reminderTimeInput"),
            REMINDERS_AVAILABLE,
            DEFAULT_PREFERENCES.reminderTime,
        ),
        theme: selectedTheme(),
        timezone: DEFAULT_PREFERENCES.timezone,
    };
}

/**
 * Collect feature flag settings from the UI elements.
 * @returns An object containing the feature flag settings.
 */
export function collectFeatureFlagsFromUI(): FeatureFlags {
    return { ...DEFAULT_FEATURE_FLAGS };
}
