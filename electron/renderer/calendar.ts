// @ts-nocheck
import { el } from "./dom.js";
import { firstPlannedRow, groupRowsByDate, monthKeysFromRows, enrichRows } from "./calendar/data.js";
import { renderCalendarDetails } from "./calendar/details.js";
import { renderCalendarMonth } from "./calendar/month.js";
import { monthLabel } from "./calendar/utils.js";

const state = {
  dates: {},
  months: [],
  index: 0,
  selectedDate: "",
  monthCellKeys: [],
};

let interactionHandlers = {
  isSessionCompleted: () => false,
  onSessionCompletionChanged: () => {},
  onSessionProgressUpdated: () => null,
  getBookById: () => null,
};

function renderDetails() {
  renderCalendarDetails(state, interactionHandlers);
}

function selectDate(dateKey, options = {}) {
  state.selectedDate = dateKey;
  renderMonth();
  renderDetails();
  if (options.focus) {
    const button = document.querySelector(`[data-calendar-day='${dateKey}']`);
    if (button instanceof HTMLElement) {
      button.focus();
    }
  }
}

function moveSelectionBy(delta, currentIndex) {
  const nextIndex = Math.min(state.monthCellKeys.length - 1, Math.max(0, currentIndex + delta));
  const nextKey = state.monthCellKeys[nextIndex];
  if (!nextKey) {
    return;
  }
  selectDate(nextKey, { focus: true });
}

function renderMonth() {
  renderCalendarMonth(state, {
    selectDate,
    moveSelectionBy,
    renderDetails,
  });
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
  prev.type = "button";
  prev.textContent = "Prev";

  const next = document.createElement("button");
  next.className = "btn";
  next.type = "button";
  next.textContent = "Next";

  prev.onclick = () => {
    state.index = Math.max(0, state.index - 1);
    renderControls();
    renderMonth();
  };

  next.onclick = () => {
    state.index = Math.min(state.months.length - 1, state.index + 1);
    renderControls();
    renderMonth();
  };

  controls.replaceChildren(prev, title, next);
}

export { firstPlannedRow };

export function renderCalendar(rows, totals) {
  const enrichedRows = enrichRows(rows, totals);
  state.dates = groupRowsByDate(enrichedRows);
  state.months = monthKeysFromRows(enrichedRows);
  state.index = 0;
  state.selectedDate = "";

  renderControls();
  renderMonth();
}

function resolveHandler(candidate, fallback) {
  if (typeof candidate === "function") {
    return candidate;
  }
  return fallback;
}

export function configureCalendarInteractions(handlers = {}) {
  interactionHandlers = {
    isSessionCompleted: resolveHandler(handlers.isSessionCompleted, () => false),
    onSessionCompletionChanged: resolveHandler(handlers.onSessionCompletionChanged, () => {}),
    onSessionProgressUpdated: resolveHandler(handlers.onSessionProgressUpdated, () => null),
    getBookById: resolveHandler(handlers.getBookById, () => null),
  };
}
