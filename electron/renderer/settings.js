import { el } from "./dom.js";

const core = [
  "start_date", "end_date", "minutes_per_day", "wpm_base", "time_quantum_minutes",
  "max_sessions_per_day", "max_books_per_day", "max_blocks_per_book_per_day",
  "w_finish", "w_priority", "w_switch", "w_smooth",
];
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const numeric = new Set([...core.filter((k) => k !== "start_date" && k !== "end_date")]);

export function initSettingsGrid() {
  const grid = el("settingsGrid");
  const names = [...core, ...weekdays.map((d) => `minutes_${d}`)];
  names.forEach((name) => {
    const label = document.createElement("label");
    label.textContent = name;
    label.innerHTML += `<input id="${name}" />`;
    grid.appendChild(label);
  });
}

export function fillSettings(settings) {
  core.forEach((k) => (el(k).value = settings?.[k] ?? ""));
  weekdays.forEach((d) => (el(`minutes_${d}`).value = settings?.minutes_by_weekday?.[d] ?? 0));
  el("days_off").value = (settings?.days_off || []).join(",");
  el("difficulty_multiplier").value = JSON.stringify(settings?.difficulty_multiplier || {}, null, 2);
}

export function collectSettings() {
  const out = {};
  core.forEach((k) => {
    const raw = el(k).value.trim();
    out[k] = numeric.has(k) ? Number(raw || 0) : raw;
  });
  out.minutes_per_day = el("minutes_per_day").value.trim() ? Number(el("minutes_per_day").value) : null;
  out.minutes_by_weekday = Object.fromEntries(weekdays.map((d) => [d, Number(el(`minutes_${d}`).value || 0)]));
  out.days_off = el("days_off").value.split(",").map((s) => s.trim()).filter(Boolean);
  out.difficulty_multiplier = JSON.parse(el("difficulty_multiplier").value || "{}");
  return out;
}
