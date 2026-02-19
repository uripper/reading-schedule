// @ts-nocheck
import {  groupRowsByDate, monthKeysFromRows, enrichRows } from "./calendar/data.js";
import { renderCalendarControls } from "./calendar/controls.js";
import { renderCalendarDetails } from "./calendar/details.js";
import { renderCalendarMonth } from "./calendar/month.js";

const DAYS_IN_WEEK = 7;

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
  renderCalendarControls(state, renderControls, renderMonth);
}



export function renderCalendar(rows, totals) {
  const previousSelectedDate = state.selectedDate;
  const previousMonthKey = state.months[state.index] || "";
  const enrichedRows = enrichRows(rows, totals);
  state.dates = groupRowsByDate(enrichedRows);
  state.months = monthKeysFromRows(enrichedRows);
  state.index = 0;
  if (previousMonthKey) {
    const previousMonthIndex = state.months.indexOf(previousMonthKey);
    if (previousMonthIndex >= 0) {
      state.index = previousMonthIndex;
    }
  }

  const previousSelectedMonth = String(previousSelectedDate || "").slice(0, DAYS_IN_WEEK);
  if (state.index === 0 && previousSelectedMonth) {
    const selectedMonthIndex = state.months.indexOf(previousSelectedMonth);
    if (selectedMonthIndex >= 0) {
      state.index = selectedMonthIndex;
    }
  }

  if (previousSelectedDate && state.dates[previousSelectedDate]) {
    state.selectedDate = previousSelectedDate;
  } else {
    state.selectedDate = "";
  }

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

export {firstPlannedRow} from "./calendar/data.js";
