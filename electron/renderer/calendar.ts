import type { PlannerScheduleRow } from "../types/types.js";
import { renderCalendarDetails } from "./calendar/details.js";
import {
  applyTodayFocus,
  indexForMonth,
  monthKeyForDateKey,
  moveSelectionBy,
  selectDate,
} from "./calendar/selection.js";
import {
  createCalendarRuntimeState,
  mergeCalendarHandlers,
  type CalendarHandlers,
} from "./calendar/state_runtime.js";
import {
  refreshDerivedRows,
  renderControls,
  renderMonth,
} from "./calendar/render_runtime.js";

const state = createCalendarRuntimeState();
let interactionHandlers: CalendarHandlers = mergeCalendarHandlers({});

/**
 * Builds synthetic month rows for books completed on a specific day.
 * @param dateKey Target day key in `YYYY-MM-DD` format.
 * @returns Month-grid rows for completed books missing explicit sessions.
 */
function completedBookRowsForDate(dateKey: string): Array<{
  book_id: string;
  date: string;
  finish: boolean;
  minutes: number;
  title: string;
}> {
  const rows: Array<{
    book_id: string;
    date: string;
    finish: boolean;
    minutes: number;
    title: string;
  }> = [];
  const sessionBooks = interactionHandlers.listSessionBooks();
  const seenBookIds = new Set<string>();
  sessionBooks.forEach((entry) => {
    const bookId = entry.bookId.trim();
    if (bookId === "") {
      return;
    }
    if (seenBookIds.has(bookId)) {
      return;
    }
    seenBookIds.add(bookId);
    const book = interactionHandlers.getBookById(bookId);
    if (book === null) {
      return;
    }
    const finishedAt = book.finished_at ?? "";
    if (finishedAt !== dateKey) {
      return;
    }
    const rawTitle = book.title.trim();
    let title = "Untitled";
    if (rawTitle !== "") {
      title = rawTitle;
    } else if (entry.title.trim() !== "") {
      title = entry.title;
    }
    rows.push({
      book_id: bookId,
      date: dateKey,
      finish: true,
      minutes: 0,
      title,
    });
  });
  return rows;
}

/**
 * Renders top summary line listing books finished on selected day.
 */
function renderFinishedBooksSummary(): void {
  const dateKey = state.selectedDate;
  if (dateKey === "") {
    return;
  }
  const completedRows = completedBookRowsForDate(dateKey);
  if (completedRows.length === 0) {
    return;
  }
  const seenTitles = new Set<string>();
  const finishedTitles: string[] = [];
  completedRows.forEach((row) => {
    const title = row.title.trim();
    if (title === "") {
      return;
    }
    if (seenTitles.has(title)) {
      return;
    }
    seenTitles.add(title);
    finishedTitles.push(title);
  });
  if (finishedTitles.length === 0) {
    return;
  }
  const details = document.getElementById("calendarDayDetails");
  if (!(details instanceof HTMLElement)) {
    return;
  }
  const summary = document.createElement("p");
  summary.className = "day-finished-summary";
  summary.textContent = `Finished: ${finishedTitles.join(", ")}`;
  const titleNode = details.querySelector("h2");
  if (titleNode instanceof HTMLElement) {
    titleNode.insertAdjacentElement("afterend", summary);
    return;
  }
  details.prepend(summary);
}

/**
 * Renders month grid and wires date selection/navigation callbacks.
 */
function renderMonthView(): void {
  refreshDerivedRows(state, interactionHandlers.isSessionCompleted);
  renderMonth(state, {
    completedBookRowsForDate,
    selectDate: (dateKey, options) => {
      selectDate(state, dateKey, renderMonthView, options);
    },
    moveSelectionBy: (delta, currentIndex) => {
      moveSelectionBy(state, delta, currentIndex, (dateKey, options) => {
        selectDate(state, dateKey, renderMonthView, options);
      });
    },
    renderDetails: () => {
      renderCalendarDetails(state, interactionHandlers, renderMonthView);
      renderFinishedBooksSummary();
    },
  });
}

/**
 * Renders calendar control bar and today-jump behavior.
 */
function renderControlsView(): void {
  const jumpToToday = (): void => {
    applyTodayFocus(state);
    renderControlsView();
    renderMonthView();
  };
  renderControls(state, renderControlsView, renderMonthView, jumpToToday);
}

/**
 * Renders full calendar from schedule rows and per-book totals.
 * @param rows Planner schedule rows.
 * @param totals Book totals keyed by `book_id`.
 */
export function renderCalendar(
  rows: PlannerScheduleRow[],
  totals: Record<string, number>,
): void {
  const previousSelectedDate = state.selectedDate;
  const previousMonthKey = state.months[state.index] || "";
  state.rawRows = [...rows];
  state.totalsByBookId = { ...totals };
  refreshDerivedRows(state, interactionHandlers.isSessionCompleted);
  state.index = 0;
  if (previousMonthKey) {
    const previousMonthIndex = state.months.indexOf(previousMonthKey);
    if (previousMonthIndex >= 0) {
      state.index = previousMonthIndex;
    }
  }
  if (previousSelectedDate !== "" && previousSelectedDate in state.dates) {
    state.selectedDate = previousSelectedDate;
  } else {
    state.selectedDate = "";
  }
  state.expectedFinishHighlightDate = "";
  if (!previousSelectedDate) {
    applyTodayFocus(state);
  }
  renderControlsView();
  renderMonthView();
}

/**
 * Moves calendar focus to today and rerenders controls/month.
 */
export function focusCalendarToday(): void {
  if (!state.months.length) {
    return;
  }
  applyTodayFocus(state);
  renderControlsView();
  renderMonthView();
}

/**
 * Moves calendar focus to a specific day key and rerenders controls/month.
 * @param dateKey Day key in `YYYY-MM-DD` format.
 */
export function focusCalendarDate(dateKey: string): void {
  if (!state.months.length) {
    return;
  }
  const monthKey = monthKeyForDateKey(dateKey);
  state.index = indexForMonth(state.months, monthKey);
  renderControlsView();
  selectDate(state, dateKey, renderMonthView);
}

/**
 * Configures interaction callbacks used by calendar details and actions.
 * @param handlers Partial interaction handler overrides.
 */
export function configureCalendarInteractions(
  handlers: Partial<CalendarHandlers> = {},
): void {
  interactionHandlers = mergeCalendarHandlers(handlers);
}

export { firstPlannedRow } from "./calendar/data.js";
