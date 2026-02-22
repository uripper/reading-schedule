import { fields } from "./settings/config.js";
import { bindDayOffAddButton, renderDayOffs } from "./settings/day_offs.js";
import { bindSettingsSectionTabs } from "./settings/section_tabs.js";
import { fillSettingsForm } from "./settings/serialize_fill.js";
import { collectSettingsForm } from "./settings/serialize_collect.js";
import { renderDifficultyRows, renderGrid, renderWeekdayGrid } from "./settings/render.js";
import type { PlannerSettings } from "./app/types.js";

let dayOffs: string[] = [];

/**
 *
 * @param nextDayOffs
 */
function setDayOffs(nextDayOffs: string[]): void {
  dayOffs = [...nextDayOffs];
  renderDayOffs(dayOffs, setDayOffs);
}

/**
 *
 */
export function initSettingsGrid(): void {
  bindSettingsSectionTabs();
  renderGrid("windowGrid", fields.window);
  renderGrid("budgetGrid", fields.budget);
  renderGrid("weightsGrid", fields.weights);
  renderWeekdayGrid();
  renderDifficultyRows();
  bindDayOffAddButton(() => dayOffs, setDayOffs);
}

/**
 *
 * @param settings
 */
export function fillSettings(settings: PlannerSettings = {}): void {
  fillSettingsForm(settings, setDayOffs);
}

/**
 *
 */
export function collectSettings(): PlannerSettings {
  return collectSettingsForm(dayOffs);
}
