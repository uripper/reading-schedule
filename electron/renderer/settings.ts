import type { PlannerSettings } from "../types/types.js";
import { fields } from "./settings/config.js";
import { bindDayOffAddButton, renderDayOffs } from "./settings/day_offs.js";
import {
    renderDifficultyRows,
    renderGrid,
    renderWeekdayGrid,
} from "./settings/render.js";
import { bindSettingsSectionTabs } from "./settings/section_tabs.js";
import { collectSettingsForm } from "./settings/serialize_collect.js";
import { fillSettingsForm } from "./settings/serialize_fill.js";

let dayOffs: string[] = [];

/**
 * Replaces day-off state and refreshes chip UI.
 * @param nextDayOffs Updated day-off weekday keys.
 */
function setDayOffs(nextDayOffs: string[]): void {
    dayOffs = [...nextDayOffs];
    renderDayOffs(dayOffs, setDayOffs);
}

/**
 * Initializes settings UI sections, grids, and day-off controls.
 */
export function initSettingsGrid(): void {
    bindSettingsSectionTabs();
    renderGrid("windowGrid", fields.window);
    renderGrid("budgetGrid", fields.budget);
    renderGrid("weightsGrid", fields.weights);
    renderGrid("displayGrid", fields.display);
    renderWeekdayGrid();
    renderDifficultyRows();
    bindDayOffAddButton(() => dayOffs, setDayOffs);
}

/**
 * Fills settings form controls from persisted planner settings.
 * @param settings Planner settings snapshot.
 */
export function fillSettings(settings: PlannerSettings = {}): void {
    fillSettingsForm(settings, setDayOffs);
}

/**
 * Collects current settings form values into planner settings payload.
 * @returns Serialized planner settings.
 */
export function collectSettings(): PlannerSettings {
    return collectSettingsForm(dayOffs);
}
