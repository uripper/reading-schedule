import { el } from "./dom.js";

let state = { dates: {}, months: [], index: 0 };

function monthLabel(key) {
  if (!key) return "No Schedule";
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(`${key}-01`));
}

function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

function renderMonth() {
  const key = state.months[state.index];
  const root = el("calendar");
  if (!key) return (root.innerHTML = "<p>No schedule yet.</p>");
  const [y, m] = key.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const cells = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  root.innerHTML = cells.map((d) => {
    const muted = d.getMonth() !== first.getMonth() ? " is-muted" : "";
    const items = (state.dates[dayKey(d)] || []).map((r) => `<span class="chip">${r.title} · ${r.minutes}m</span>`).join("");
    return `<article class="day${muted}"><div class="day-date">${d.getDate()}</div>${items}</article>`;
  }).join("");
}

function renderControls() {
  const key = state.months[state.index] || "";
  if (!key) {
    el("calendarControls").innerHTML = `<strong>${monthLabel(key)}</strong>`;
    return;
  }
  el("calendarControls").innerHTML = `<button class="btn" id="prevMonth">Prev</button><strong>${monthLabel(key)}</strong><button class="btn" id="nextMonth">Next</button>`;
  el("prevMonth").onclick = () => { state.index = Math.max(0, state.index - 1); renderControls(); renderMonth(); };
  el("nextMonth").onclick = () => { state.index = Math.min(state.months.length - 1, state.index + 1); renderControls(); renderMonth(); };
}

export function renderCalendar(rows) {
  state.dates = rows.reduce((a, r) => ((a[r.date] ||= []).push(r), a), {});
  state.months = [...new Set(rows.map((r) => r.date.slice(0, 7)))].sort();
  state.index = 0;
  renderControls();
  renderMonth();
}
