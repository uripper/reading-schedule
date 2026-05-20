import { parseSettings, safeParseSettings } from "@reading-schedule/contracts";
import { logDebug } from "../types/logger.ts";
import type { PlannerSettings } from "../types/types.ts";
import { bindDateInput } from "./date_control.ts";
import { FIELDS } from "./settings/config_fields.ts";
import { bindDayOffAddButton, renderDayOffs } from "./settings/day_offs.ts";
import { renderGrid, renderWeekdayGrid } from "./settings/render.ts";
import { bindSettingsSectionTabs } from "./settings/section_tabs.ts";
import { collectSettingsForm } from "./settings/serialize_collect.ts";
import { fillSettingsForm } from "./settings/serialize_fill.ts";

let dayOffs: string[] = [];

/**
 * Replaces day-off state and refreshes chip UI.
 * @param nextDayOffs - Updated day-off weekday keys.
 */
function setDayOffs(nextDayOffs: string[]): void {
    dayOffs = [...nextDayOffs];
    renderDayOffs(dayOffs, setDayOffs);
}

function bindSettingsDateInputs(): void {
    bindDateInput(document.getElementById("dayOffPicker") as HTMLInputElement, {
        placeholder: "Add a day off",
    });
}

/**
 * Initializes settings UI sections, grids, and day-off controls.
 */
export function initSettingsGrid(): void {
    bindSettingsSectionTabs();
    renderGrid("budgetGrid", FIELDS.budget);
    renderGrid("displayGrid", FIELDS.display);
    renderWeekdayGrid();
    bindSettingsDateInputs();
    bindDayOffAddButton(() => dayOffs, setDayOffs);
}

/**
 * Fills settings form controls from persisted planner settings.
 * @param settings - Planner settings snapshot.
 */
export function fillSettings(settings: PlannerSettings = {}): void {
    const RESULT = safeParseSettings(settings);
    if (!RESULT.success) {
        logDebug(
            "Failed to parse persisted settings; falling back to defaults.",
            {
                issueCount: RESULT.error.issues.length,
            },
        );
        fillSettingsForm({}, setDayOffs);
        return;
    }

    let dayOffCount = 0;
    if (Array.isArray(RESULT.data.day_offs)) {
        dayOffCount = RESULT.data.day_offs.length;
    }

    logDebug("Applied persisted settings to settings form.", {
        dayOffCount,
    });
    fillSettingsForm(RESULT.data, setDayOffs);
}

/**
 * Collects current settings form values into planner settings payload.
 * @returns Serialized planner settings.
 */
export function collectSettings(): PlannerSettings {
    const RAW_SETTINGS = collectSettingsForm(dayOffs);
    logDebug("Collected settings payload from form.", {
        dayOffCount: dayOffs.length,
        hasEndDate:
            typeof RAW_SETTINGS.end_date === "string" &&
            RAW_SETTINGS.end_date.trim() !== "",
    });
    return parseSettings(RAW_SETTINGS);
}
