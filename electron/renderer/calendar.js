import { el } from "./dom.js";

let state = { dates: {}, months: [], index: 0 };

function monthLabel(key) {
  if (!key) return "No Schedule";
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
}

function dayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function enrichRows(rows, totals = {}) {
  const progress = {};
  return [...rows].sort((a, b) => `${a.date}-${String(a.session_index).padStart(3, "0")}`.localeCompare(`${b.date}-${String(b.session_index).padStart(3, "0")}`)).map((r) => {
    progress[r.book_id] = (progress[r.book_id] || 0) + Number(r.words_planned || 0);
    return { ...r, finish: (totals[r.book_id] || 0) > 0 && progress[r.book_id] >= totals[r.book_id] };
  });
}

function renderMonth() {
  const key = state.months[state.index];
  if (!key) return (el("calendar").innerHTML = "<p>No schedule yet.</p>");
  const [y, m] = key.split("-").map(Number);
  const first = new Date(y, m - 1, 1), start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const cells = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  el("calendar").innerHTML = cells.map((d) => {
    const muted = d.getMonth() !== first.getMonth() ? " is-muted" : "";
    const items = (state.dates[dayKey(d)] || []).map((r) => `<span class="chip${r.finish ? " finish" : ""}">${r.title} · ${r.minutes}m${r.finish ? " · FINISH" : ""}</span>`).join("");
    return `<article class="day${muted}"><div class="day-date">${d.getDate()}</div>${items}</article>`;
  }).join("");
}

function renderControls() {
  const key = state.months[state.index] || "";
  if (!key) return (el("calendarControls").innerHTML = `<strong>${monthLabel(key)}</strong>`);
  el("calendarControls").innerHTML = `<button class="btn" id="prevMonth">Prev</button><strong>${monthLabel(key)}</strong><button class="btn" id="nextMonth">Next</button>`;
  el("prevMonth").onclick = () => { state.index = Math.max(0, state.index - 1); renderControls(); renderMonth(); };
  el("nextMonth").onclick = () => { state.index = Math.min(state.months.length - 1, state.index + 1); renderControls(); renderMonth(); };
}

export function renderCalendar(rows, totals) {
  const enriched = enrichRows(rows, totals);
  state.dates = enriched.reduce((a, r) => ((a[r.date] ||= []).push(r), a), {});
  state.months = [...new Set(enriched.map((r) => r.date.slice(0, 7)))].sort();
  state.index = 0;
  renderControls();
  renderMonth();
}
