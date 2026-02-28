import { type FeatureFlags, type Preferences } from "../../../types/types.js";
import { el } from "../../dom.js";
import {
    RECOMMENDATIONS_AVAILABLE,
    REMINDERS_AVAILABLE,
    SOCIAL_FEATURES_AVAILABLE,
    shippedFeatureFlag,
    shippedReminderTime,
} from "./availability.js";
import { DEFAULT_PREFERENCES, isSupportedTheme } from "./model.js";

/**
 * Reads a numeric input and normalizes empty or invalid values to 0.
 * @param id Input element id.
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
 * @param id Checkbox element id.
 * @returns Checked state.
 */
function checkboxValue(id: string): boolean {
    return el<HTMLInputElement>(id).checked;
}

/**
 * Reads text-like input value.
 * @param id Input element id.
 * @returns Raw input value.
 */
function inputValue(id: string): string {
    return el<HTMLInputElement>(id).value;
}

/**
 * Reads the current selected option value.
 * @param id Select element id.
 * @returns Selected option value.
 */
function selectValue(id: string): string {
    return el<HTMLSelectElement>(id).value;
}

/**
 * Collect user preferences from the UI elements.
 * @returns An object containing the user preferences.
 */
export function collectPreferencesFromUI(): Preferences {
    let theme: Preferences["theme"] = DEFAULT_PREFERENCES.theme;
    const SELECTED_THEME = selectValue("themeSelect");
    if (isSupportedTheme(SELECTED_THEME)) {
        theme = SELECTED_THEME;
    }

    return {
        dailyGoalMinutes:
            numberInputValue("dailyGoalInput") ||
            DEFAULT_PREFERENCES.dailyGoalMinutes,
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
        theme,
        timezone: DEFAULT_PREFERENCES.timezone,
    };
}

/**
 * Collect feature flag settings from the UI elements.
 * @returns An object containing the feature flag settings.
 */
export function collectFeatureFlagsFromUI(): FeatureFlags {
    return {
        gamificationEnabled: checkboxValue("flagGamification"),
        recommendationsEnabled: shippedFeatureFlag(
            checkboxValue("flagRecommendations"),
            RECOMMENDATIONS_AVAILABLE,
        ),
        socialEnabled: shippedFeatureFlag(
            checkboxValue("flagSocial"),
            SOCIAL_FEATURES_AVAILABLE,
        ),
    };
}
