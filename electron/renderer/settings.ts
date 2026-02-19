import { el, qa } from "./dom.js";
import {
  DEFAULT_DIFFICULTY_MULTIPLIER,
  DEFAULT_PLAN_MODE,
  DIFFICULTY_LEVEL_COUNT,
  fields,
  weekdays,
} from "./settings/config.js";
import { bindDayOffAddButton, renderDayOffs } from "./settings/day_offs.js";
import { renderDifficultyRows, renderGrid, renderWeekdayGrid } from "./settings/render.js";
import type { PlannerSettings } from "./app/types.js";
import type { FieldDefinition } from "./settings/config.js";

let dayOffs: string[] = [];
const DEFAULT_SETTINGS_SECTION = "plan-budget";

function inputEl(id: string): HTMLInputElement {
  return el<HTMLInputElement>(id);
}

function selectEl(id: string): HTMLSelectElement {
  return el<HTMLSelectElement>(id);
}

function allFieldDefinitions(): FieldDefinition[] {
  return Object.values(fields).flat();
}

function numberLevels(): number[] {
  return Array.from({ length: DIFFICULTY_LEVEL_COUNT }, (_, index) => index + 1);
}

function setDayOffs(nextDayOffs: string[]): void {
  dayOffs = [...nextDayOffs];
  renderDayOffs(dayOffs, setDayOffs);
}

function activateSettingsSection(nextSection: string): void {
  const section = String(nextSection || DEFAULT_SETTINGS_SECTION);
  qa<HTMLElement>("[data-settings-section]").forEach((card) => {
    const active = card.dataset.settingsSection === section;
    card.hidden = !active;
    if (active) {
      card.style.display = "grid";
    } else {
      card.style.display = "none";
    }
  });
  qa<HTMLElement>(".settings-section-tab").forEach((button) => {
    const active = button.dataset.settingsSectionTarget === section;
    button.classList.toggle("is-active", active);
    let ariaSelected = "false";
    if (active) {
      ariaSelected = "true";
    }
    button.setAttribute("aria-selected", ariaSelected);
  });
}

function bindSettingsSectionTabs(): void {
  const tabs = qa<HTMLElement>(".settings-section-tab");
  tabs.forEach((button) => {
    button.addEventListener("click", () => {
      activateSettingsSection(String(button.dataset.settingsSectionTarget || DEFAULT_SETTINGS_SECTION));
    });
  });
  activateSettingsSection(DEFAULT_SETTINGS_SECTION);
}

function fieldInputValue(field: FieldDefinition): string {
  if (field.type === "select") {
    return selectEl(field.id).value.trim();
  }
  return inputEl(field.id).value.trim();
}

export function initSettingsGrid(): void {
  bindSettingsSectionTabs();
  renderGrid("windowGrid", fields.window);
  renderGrid("budgetGrid", fields.budget);
  renderGrid("weightsGrid", fields.weights);
  renderWeekdayGrid();
  renderDifficultyRows();
  bindDayOffAddButton(() => dayOffs, setDayOffs);
}

export function fillSettings(settings: PlannerSettings = {}): void {
  allFieldDefinitions().forEach((field) => {
    const value = settings[field.id];
    if (field.type === "select") {
      selectEl(field.id).value = String(value ?? DEFAULT_PLAN_MODE);
      return;
    }
    let normalizedValue = "";
    if (value !== undefined && value !== null) {
      normalizedValue = String(value);
    }
    inputEl(field.id).value = normalizedValue;
  });

  const minutesByWeekday = settings.minutes_by_weekday || {};
  weekdays.forEach(([key]) => {
    inputEl(`minutes_${key}`).value = String(minutesByWeekday[key] ?? 0);
  });

  setDayOffs([...(settings.days_off as string[] || [])].sort());

  const difficultyMultiplier = settings.difficulty_multiplier || {};
  numberLevels().forEach((level) => {
    const id = `diff_${level}`;
    const exactLevel = difficultyMultiplier[level];
    const stringLevel = difficultyMultiplier[String(level)];
    const value = exactLevel ?? stringLevel ?? DEFAULT_DIFFICULTY_MULTIPLIER;
    inputEl(id).value = String(value);
  });
}

export function collectSettings(): PlannerSettings {
  const output: PlannerSettings = {};

  allFieldDefinitions().forEach((field) => {
    const raw = fieldInputValue(field);
    if (field.type === "date" || field.type === "select") {
      output[field.id] = raw;
      return;
    }
    output[field.id] = Number(raw || 0);
  });

  const minutesPerDayRaw = inputEl("minutes_per_day").value.trim();
  output.minutes_per_day = null;
  if (minutesPerDayRaw) {
    output.minutes_per_day = Number(minutesPerDayRaw);
  }

  output.minutes_by_weekday = Object.fromEntries(
    weekdays.map(([key]) => [key, Number(inputEl(`minutes_${key}`).value || 0)]),
  );
  output.days_off = [...dayOffs];
  output.difficulty_multiplier = Object.fromEntries(
    numberLevels().map((level) => {
      const value = Number(inputEl(`diff_${level}`).value || DEFAULT_DIFFICULTY_MULTIPLIER);
      return [String(level), value];
    }),
  );

  return output;
}
