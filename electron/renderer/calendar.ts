import {  groupRowsByDate, monthKeysFromRows, enrichRows } from "./calendar/data.js";
import { renderCalendarControls } from "./calendar/controls.js";
import { renderCalendarDetails } from "./calendar/details.js";
import { renderCalendarMonth } from "./calendar/month.js";

const DAYS_IN_WEEK = 7;

type CalendarRow = {
  title?: string;
  date?: string;
  book_id?: string;
};

type CalendarHandlers = {
  isSessionCompleted: (sessionKey: string) => boolean;
  onSessionCompletionChanged: (payload: { sessionKey: string; completed: boolean; row: CalendarRow }) => void;
  onSessionProgressUpdated: (payload: {
    bookId: string;
    pagesRead?: number | null;
    progressPercent?: number | null;
  }) => unknown;
  getBookById: (bookId: string) => unknown;
};

const state = {
  dates: {} as Record<string, CalendarRow[]>,
  months: [] as string[],
  index: 0,
  selectedDate: "",
  monthCellKeys: [] as string[],
};

let interactionHandlers: CalendarHandlers = {
  isSessionCompleted: () => false,
  onSessionCompletionChanged: () => {},
  onSessionProgressUpdated: () => null,
  getBookById: () => null,
};

function renderDetails() {
  renderCalendarDetails(state, interactionHandlers);
}

function selectDate(dateKey: string, options: { focus?: boolean } = {}) {
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

function moveSelectionBy(delta: number, currentIndex: number) {
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



export function renderCalendar(rows: CalendarRow[], totals: Record<string, number>) {
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

function resolveHandler<T extends (...args: never[]) => unknown>(candidate: unknown, fallback: T): T {
  if (typeof candidate === "function") {
    return candidate as T;
  }
  return fallback;
}

export function configureCalendarInteractions(handlers: Partial<CalendarHandlers> = {}) {
  interactionHandlers = {
    isSessionCompleted: resolveHandler(handlers.isSessionCompleted, () => false),
    onSessionCompletionChanged: resolveHandler(handlers.onSessionCompletionChanged, () => {}),
    onSessionProgressUpdated: resolveHandler(handlers.onSessionProgressUpdated, () => null),
    getBookById: resolveHandler(handlers.getBookById, () => null),
  };
}

export {firstPlannedRow} from "./calendar/data.js";
