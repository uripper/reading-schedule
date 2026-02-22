import type { PlannerScheduleRow } from "./app/types.js";
import { renderCalendarDetails } from "./calendar/details.js";
import { applyTodayFocus, moveSelectionBy, selectDate } from "./calendar/selection.js";
import {
  createCalendarRuntimeState,
  mergeCalendarHandlers,
  type CalendarHandlers,
} from "./calendar/state_runtime.js";
import { refreshDerivedRows, renderControls, renderMonth } from "./calendar/render_runtime.js";

const state = createCalendarRuntimeState();
let interactionHandlers: CalendarHandlers = mergeCalendarHandlers({});

/**
 * Rerenders selected-day details using current runtime state.
 */
function renderDetails(): void {
  refreshDerivedRows(state, interactionHandlers.isSessionCompleted);
  renderCalendarDetails(state, interactionHandlers, renderDetails);
}

/**
 * Renders month grid and wires date selection/navigation callbacks.
 */
function renderMonthView(): void {
  renderMonth(state, {
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
 *
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
  if (previousSelectedDate && state.dates[previousSelectedDate]) {
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
 * Configures interaction callbacks used by calendar details and actions.
 *
 * @param handlers Partial interaction handler overrides.
 */
export function configureCalendarInteractions(
  handlers: Partial<CalendarHandlers> = {},
): void {
  interactionHandlers = mergeCalendarHandlers(handlers);
}

export { firstPlannedRow } from "./calendar/data.js";
