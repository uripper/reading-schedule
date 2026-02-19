import { groupRowsByDate, monthKeysFromRows, enrichRows } from "./calendar/data.js";
import { renderCalendarControls } from "./calendar/controls.js";
import { renderCalendarDetails } from "./calendar/details.js";
import { renderCalendarMonth } from "./calendar/month.js";

const DAYS_IN_WEEK = 7;

type CalendarRow = {
  title?: string;
  date: string;
  book_id: string;
  session_index: string | number;
  words_planned?: number;
  [key: string]: unknown;
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
  rows: [] as CalendarRow[],
  totalsByBookId: {} as Record<string, number>,
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

function todayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthKeyForDateKey(dateKey: string) {
  return dateKey.slice(0, DAYS_IN_WEEK);
}

function indexForMonth(months: string[], targetMonthKey: string) {
  const exactIndex = months.indexOf(targetMonthKey);
  if (exactIndex >= 0) {
    return exactIndex;
  }

  const upcomingIndex = months.findIndex((monthKey) => {
    return monthKey >= targetMonthKey;
  });
  if (upcomingIndex >= 0) {
    return upcomingIndex;
  }

  return Math.max(0, months.length - 1);
}

function applyTodayFocus() {
  if (!state.months.length) {
    return;
  }

  const todayKey = todayDateKey();
  const todayMonthKey = monthKeyForDateKey(todayKey);
  state.index = indexForMonth(state.months, todayMonthKey);
  state.selectedDate = "";
  if (state.months[state.index] === todayMonthKey) {
    state.selectedDate = todayKey;
  }
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
  state.rows = enrichedRows;
  state.totalsByBookId = { ...totals };
  state.dates = groupRowsByDate(enrichedRows);
  state.months = monthKeysFromRows(enrichedRows);
  state.index = 0;
  if (previousMonthKey) {
    const previousMonthIndex = state.months.indexOf(previousMonthKey);
    if (previousMonthIndex >= 0) {
      state.index = previousMonthIndex;
    }
  }

  if (previousSelectedDate && state.dates[previousSelectedDate]) {
    state.selectedDate = previousSelectedDate;
  } else {
    state.selectedDate = "";
  }
  if (!previousSelectedDate) {
    applyTodayFocus();
  }

  renderControls();
  renderMonth();
}

export function focusCalendarToday() {
  if (!state.months.length) {
    return;
  }
  applyTodayFocus();
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

export { firstPlannedRow } from "./calendar/data.js";
