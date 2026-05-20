import type { Preferences } from "../../../types/types.ts";
import { el } from "../../dom.ts";
import {
    REMINDERS_AVAILABLE,
    shippedFeatureFlag,
    shippedReminderTime,
} from "./availability.ts";
import { DEFAULT_PREFERENCES } from "./model.ts";

function fillCorePreferenceControls(preferences: Preferences): void {
    el<HTMLSelectElement>("themeSelect").value = preferences.theme;
    el<HTMLInputElement>("reduceMotionToggle").checked = Boolean(
        preferences.reduceMotion,
    );
    el<HTMLInputElement>("dailyGoalInput").value = String(
        preferences.dailyGoalMinutes || DEFAULT_PREFERENCES.dailyGoalMinutes,
    );
}

function fillReminderControls(preferences: Preferences): void {
    el<HTMLInputElement>("reminderEnabledToggle").checked = shippedFeatureFlag(
        preferences.reminderEnabled,
        REMINDERS_AVAILABLE,
    );
    el<HTMLInputElement>("reminderTimeInput").value = shippedReminderTime(
        preferences.reminderTime,
        REMINDERS_AVAILABLE,
        DEFAULT_PREFERENCES.reminderTime,
    );
}

/**
 * Fills the experience settings UI controls based on the provided preferences and feature flags.
 * @param preferences - User preferences to populate the UI with.
 */
export function fillPreferencesUI(preferences: Preferences): void {
    fillCorePreferenceControls(preferences);
    fillReminderControls(preferences);
}
