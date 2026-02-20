import type { PlannerScheduleRow } from './app/types.js';
import type { Book } from './books/types.js';
import { enrichRows, groupRowsByDate, monthKeysFromRows, type CalendarRowWithFinish } from './calendar/data.js';
import { renderCalendarControls } from './calendar/controls.js';
import { renderCalendarDetails } from './calendar/details.js';
import { renderCalendarMonth } from './calendar/month.js';

const DAYS_IN_WEEK = 7;

type CompletionChangePayload = {
  sessionKey: string;
  completed: boolean;
  row: CalendarRowWithFinish;
};

type ProgressUpdatePayload = {
  bookId: string;
  pagesRead?: number | null;
  progressPercent?: number | null;
};

type CalendarHandlers = {
  isSessionCompleted: (sessionKey: string) => boolean;
  hasSessionProgressUpdate: (sessionKey: string) => boolean;
  onSessionCompletionChanged: (payload: CompletionChangePayload) => void;
  onSessionProgressUpdated: (payload: ProgressUpdatePayload) => Book | null;
  getBookById: (bookId: string) => Book | null;
};

const state = {
  dates: {} as Record<string, CalendarRowWithFinish[]>,
  rawRows: [] as PlannerScheduleRow[],
  rows: [] as CalendarRowWithFinish[],
  totalsByBookId: {} as Record<string, number>,
  months: [] as string[],
  index: 0,
  selectedDate: '',
  monthCellKeys: [] as string[],
  expectedFinishHighlightDate: '',
};

const defaultHandlers: CalendarHandlers = {
  isSessionCompleted: () => false,
  hasSessionProgressUpdate: () => false,
  onSessionCompletionChanged: () => {},
  onSessionProgressUpdated: () => null,
  getBookById: () => null,
};

let interactionHandlers: CalendarHandlers = { ...defaultHandlers };

function refreshDerivedRows(): void {
  const enrichedRows = enrichRows(
    state.rawRows,
    state.totalsByBookId,
    interactionHandlers.isSessionCompleted,
    interactionHandlers.hasSessionProgressUpdate,
  );
  state.rows = enrichedRows;
  state.dates = groupRowsByDate(enrichedRows);
  state.months = monthKeysFromRows(enrichedRows);
}

function renderDetails(): void {
  refreshDerivedRows();
  renderCalendarDetails(state, interactionHandlers, renderDetails);
}

function todayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthKeyForDateKey(dateKey: string): string {
  return dateKey.slice(0, DAYS_IN_WEEK);
}

function indexForMonth(months: string[], targetMonthKey: string): number {
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

function applyTodayFocus(): void {
  if (!state.months.length) {
    return;
  }

  const todayKey = todayDateKey();
  const todayMonthKey = monthKeyForDateKey(todayKey);
  state.index = indexForMonth(state.months, todayMonthKey);
  state.selectedDate = '';
  if (state.months[state.index] === todayMonthKey) {
    state.selectedDate = todayKey;
  }
}

function selectDate(dateKey: string, options: { focus?: boolean } = {}): void {
  state.selectedDate = dateKey;
  state.expectedFinishHighlightDate = dateKey;
  renderMonth();
  if (options.focus) {
    const button = document.querySelector(`[data-calendar-day='${dateKey}']`);
    if (button instanceof HTMLElement) {
      button.focus();
    }
  }
}

function moveSelectionBy(delta: number, currentIndex: number): void {
  const nextIndex = Math.min(state.monthCellKeys.length - 1, Math.max(0, currentIndex + delta));
  const nextKey = state.monthCellKeys[nextIndex];
  if (!nextKey) {
    return;
  }
  selectDate(nextKey, { focus: true });
}

function renderMonth(): void {
  renderCalendarMonth(state, {
    selectDate,
    moveSelectionBy,
    renderDetails,
  });
}

function renderControls(): void {
  renderCalendarControls(state, renderControls, renderMonth);
}

export function renderCalendar(rows: PlannerScheduleRow[], totals: Record<string, number>): void {
  const previousSelectedDate = state.selectedDate;
  const previousMonthKey = state.months[state.index] || '';
  state.rawRows = [...rows];
  state.totalsByBookId = { ...totals };
  refreshDerivedRows();
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
    state.selectedDate = '';
  }
  state.expectedFinishHighlightDate = '';
  if (!previousSelectedDate) {
    applyTodayFocus();
  }

  renderControls();
  renderMonth();
}

export function focusCalendarToday(): void {
  if (!state.months.length) {
    return;
  }
  applyTodayFocus();
  renderControls();
  renderMonth();
}

export function configureCalendarInteractions(handlers: Partial<CalendarHandlers> = {}): void {
  interactionHandlers = {
    isSessionCompleted: handlers.isSessionCompleted || defaultHandlers.isSessionCompleted,
    hasSessionProgressUpdate: handlers.hasSessionProgressUpdate || defaultHandlers.hasSessionProgressUpdate,
    onSessionCompletionChanged: handlers.onSessionCompletionChanged || defaultHandlers.onSessionCompletionChanged,
    onSessionProgressUpdated: handlers.onSessionProgressUpdated || defaultHandlers.onSessionProgressUpdated,
    getBookById: handlers.getBookById || defaultHandlers.getBookById,
  };
}

export { firstPlannedRow } from './calendar/data.js';
