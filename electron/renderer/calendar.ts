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
 * Rerenders selected-day details using current runtime state.
 */
function renderDetails(): void {
  renderCalendarDetails(state, interactionHandlers, renderMonthView);
}

/**
 * Renders month grid and wires date selection/navigation callbacks.
 */
function renderMonthView(): void {
  refreshDerivedRows(state, interactionHandlers.isSessionCompleted);
  renderMonth(state, {
    isSessionCompleted: interactionHandlers.isSessionCompleted,
    selectDate: (dateKey, options) => {
      selectDate(state, dateKey, renderMonthView, options);
    },
    moveSelectionBy: (delta, currentIndex) => {
      moveSelectionBy(state, delta, currentIndex, (dateKey, options) => {
        selectDate(state, dateKey, renderMonthView, options);
      });
    },
    renderDetails,
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
