// @ts-nocheck

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

let dayOffs = [];
const DEFAULT_SETTINGS_SECTION = "plan-budget";

function setDayOffs(nextDayOffs) {
  dayOffs = [...nextDayOffs];
  renderDayOffs(dayOffs, setDayOffs);
}

function allFieldDefinitions() {
  return Object.values(fields).flat();
}

function forEachDifficultyLevel(callback) {
  Array.from({ length: DIFFICULTY_LEVEL_COUNT }, (_, index) => index + 1).forEach(callback);
}

function activateSettingsSection(nextSection) {
  const section = String(nextSection || DEFAULT_SETTINGS_SECTION);
  qa("[data-settings-section]").forEach((card) => {
    const active = card.dataset.settingsSection === section;
    card.hidden = !active;
  });
  qa(".settings-section-tab").forEach((button) => {
    const active = button.dataset.settingsSectionTarget === section;
    button.classList.toggle("is-active", active);
    if (active) {
      button.setAttribute("aria-selected", "true");
    } else {
      button.setAttribute("aria-selected", "false");
    }
  });
}

function bindSettingsSectionTabs() {
  const tabs = qa(".settings-section-tab");
  tabs.forEach((button) => {
    button.addEventListener("click", () => {
      activateSettingsSection(button.dataset.settingsSectionTarget);
    });
  });
  activateSettingsSection(DEFAULT_SETTINGS_SECTION);
}

export function initSettingsGrid() {
  bindSettingsSectionTabs();
  renderGrid("windowGrid", fields.window);
  renderGrid("budgetGrid", fields.budget);
  renderGrid("weightsGrid", fields.weights);
  renderWeekdayGrid();
  renderDifficultyRows();
  bindDayOffAddButton(() => dayOffs, setDayOffs);
}

export function fillSettings(settings) {
  allFieldDefinitions().forEach((field) => {
    const value = settings?.[field.id];
    if (field.type === "select") {
      el(field.id).value = value ?? DEFAULT_PLAN_MODE;
      return;
    }
    el(field.id).value = value ?? "";
  });

  weekdays.forEach(([key]) => {
    el(`minutes_${key}`).value = settings?.minutes_by_weekday?.[key] ?? 0;
  });

  setDayOffs([...(settings?.days_off || [])].sort());

  forEachDifficultyLevel((level) => {
    const id = `diff_${level}`;
    const exactLevel = settings?.difficulty_multiplier?.[level];
    const stringLevel = settings?.difficulty_multiplier?.[String(level)];
    const value = exactLevel ?? stringLevel ?? DEFAULT_DIFFICULTY_MULTIPLIER;
    el(id).value = value;
  });
}

export function collectSettings() {
  const output = {};

  allFieldDefinitions().forEach((field) => {
    const raw = el(field.id).value.trim();
    if (field.type === "date" || field.type === "select") {
      output[field.id] = raw;
      return;
    }
    output[field.id] = Number(raw || 0);
  });

  output.minutes_per_day = null;
  if (el("minutes_per_day").value.trim()) {
    output.minutes_per_day = Number(el("minutes_per_day").value);
  }

  output.minutes_by_weekday = Object.fromEntries(
    weekdays.map(([key]) => [key, Number(el(`minutes_${key}`).value || 0)]),
  );
  output.days_off = [...dayOffs];
  output.difficulty_multiplier = Object.fromEntries(
    Array.from({ length: DIFFICULTY_LEVEL_COUNT }, (_, index) => {
      const level = index + 1;
      const value = Number(el(`diff_${level}`).value || DEFAULT_DIFFICULTY_MULTIPLIER);
      return [String(level), value];
    }),
  );

  return output;
}
