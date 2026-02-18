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
  const calendar = el("calendar");
  if (!key) {
    const empty = document.createElement("p");
    empty.textContent = "No schedule yet.";
    calendar.replaceChildren(empty);
    return;
  }
  const [y, m] = key.split("-").map(Number);
  const first = new Date(y, m - 1, 1), start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const cells = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const days = cells.map((d) => {
    const day = document.createElement("article");
    day.className = d.getMonth() !== first.getMonth() ? "day is-muted" : "day";
    const dayDate = document.createElement("div");
    dayDate.className = "day-date";
    dayDate.textContent = String(d.getDate());
    day.append(dayDate);
    (state.dates[dayKey(d)] || []).forEach((row) => {
      const chip = document.createElement("span");
      chip.className = row.finish ? "chip finish" : "chip";
      chip.textContent = `${row.title} · ${row.minutes}m${row.finish ? " · FINISH" : ""}`;
      day.append(chip);
    });
    return day;
  });
  calendar.replaceChildren(...days);
}

function renderControls() {
  const key = state.months[state.index] || "";
  const controls = el("calendarControls");
  const title = document.createElement("strong");
  title.textContent = monthLabel(key);
  if (!key) {
    controls.replaceChildren(title);
    return;
  }
  const prev = document.createElement("button");
  prev.className = "btn";
  prev.id = "prevMonth";
  prev.type = "button";
  prev.textContent = "Prev";
  const next = document.createElement("button");
  next.className = "btn";
  next.id = "nextMonth";
  next.type = "button";
  next.textContent = "Next";
  prev.onclick = () => { state.index = Math.max(0, state.index - 1); renderControls(); renderMonth(); };
  next.onclick = () => { state.index = Math.min(state.months.length - 1, state.index + 1); renderControls(); renderMonth(); };
  controls.replaceChildren(prev, title, next);
}

export function renderCalendar(rows, totals) {
  const enriched = enrichRows(rows, totals);
  state.dates = enriched.reduce((a, r) => ((a[r.date] ||= []).push(r), a), {});
  state.months = [...new Set(enriched.map((r) => r.date.slice(0, 7)))].sort();
  state.index = 0;
  renderControls();
  renderMonth();
}
