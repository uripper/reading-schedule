import { el, qa } from "./dom.js";

const fields = {
  window: [{ id: "start_date", label: "Start date", type: "date" }, { id: "end_date", label: "End date", type: "date" }],
  budget: [{ id: "minutes_per_day", label: "Default reading minutes per day", hint: "Fallback if weekday minutes are not set." }, { id: "wpm_base", label: "Base reading speed (words/minute)" }, { id: "time_quantum_minutes", label: "Planning block size (minutes)", hint: "Smallest scheduling chunk the optimizer uses." }, { id: "max_sessions_per_day", label: "Maximum sessions per day" }, { id: "max_books_per_day", label: "Maximum different books per day" }, { id: "max_blocks_per_book_per_day", label: "Maximum blocks per book per day", hint: "Prevents one book from taking the full day." }],
  weights: [{ id: "w_finish", label: "Finish reward", hint: "Higher means finishing books is prioritized.", step: "0.1" }, { id: "w_priority", label: "Priority weight", hint: "Higher means high-priority books get more time.", step: "0.1" }, { id: "w_switch", label: "Switch penalty", hint: "Higher means fewer book switches per day.", step: "0.1" }, { id: "w_smooth", label: "Difficulty smoothing", hint: "Higher means steadier day-to-day reading load.", step: "0.1" }],
};
const weekdays = [["Mon", "Monday"], ["Tue", "Tuesday"], ["Wed", "Wednesday"], ["Thu", "Thursday"], ["Fri", "Friday"], ["Sat", "Saturday"], ["Sun", "Sunday"]];
let dayOffs = [];

function esc(text) { return String(text || "").replace(/"/g, "&quot;"); }
function hint(text) { return text ? ` <span class="hint-dot" tabindex="0" role="note" data-tip="${esc(text)}">?</span>` : ""; }
function input(field) { return `<label>${field.label}${hint(field.hint)}<input id="${field.id}" type="${field.type || "number"}" ${field.step ? `step="${field.step}"` : ""}/></label>`; }
function renderGrid(id, defs) { el(id).innerHTML = defs.map(input).join(""); }

function renderDayOffs() {
  el("dayOffList").innerHTML = dayOffs.map((d) => `<button class="chip-btn" data-day="${d}">${d} x</button>`).join("");
  qa("#dayOffList button").forEach((btn) => (btn.onclick = () => { dayOffs = dayOffs.filter((d) => d !== btn.dataset.day); renderDayOffs(); }));
}

export function initSettingsGrid() {
  renderGrid("windowGrid", fields.window); renderGrid("budgetGrid", fields.budget); renderGrid("weightsGrid", fields.weights);
  el("weekdayGrid").innerHTML = weekdays.map(([k, n]) => `<label>${n} minutes<input id="minutes_${k}" type="number" /></label>`).join("");
  el("difficultyBody").innerHTML = Array.from({ length: 10 }, (_, i) => `<tr><td>${i + 1}</td><td><input id="diff_${i + 1}" type="number" step="0.05" min="0.05" max="2" /></td></tr>`).join("");
  el("addDayOffBtn").onclick = () => { const d = el("dayOffPicker").value; if (d && !dayOffs.includes(d)) { dayOffs = [...dayOffs, d].sort(); renderDayOffs(); } };
}

export function fillSettings(settings) {
  Object.values(fields).flat().forEach((f) => (el(f.id).value = settings?.[f.id] ?? ""));
  weekdays.forEach(([k]) => (el(`minutes_${k}`).value = settings?.minutes_by_weekday?.[k] ?? 0));
  dayOffs = [...(settings?.days_off || [])].sort(); renderDayOffs();
  Array.from({ length: 10 }, (_, i) => i + 1).forEach((n) => (el(`diff_${n}`).value = settings?.difficulty_multiplier?.[n] ?? settings?.difficulty_multiplier?.[String(n)] ?? 1));
}

export function collectSettings() {
  const out = {};
  Object.values(fields).flat().forEach((f) => { const raw = el(f.id).value.trim(); out[f.id] = f.type === "date" ? raw : Number(raw || 0); });
  out.minutes_per_day = el("minutes_per_day").value.trim() ? Number(el("minutes_per_day").value) : null;
  out.minutes_by_weekday = Object.fromEntries(weekdays.map(([k]) => [k, Number(el(`minutes_${k}`).value || 0)]));
  out.days_off = [...dayOffs];
  out.difficulty_multiplier = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i + 1), Number(el(`diff_${i + 1}`).value || 1)]));
  return out;
}
