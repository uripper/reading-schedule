import {
  enrichRows,
  groupRowsByDate,
  monthKeysFromRows,
} from "./data.js";
import { buildMonthWindow } from "./month_window.js";
import { renderCalendarControls } from "./controls.js";
import { renderCalendarMonth } from "./month.js";
import type { CalendarRuntimeState } from "./state_runtime.js";

/**
 * Recomputes derived calendar collections from current raw rows and handlers.
 * @param state Mutable calendar runtime state.
 * @param isSessionCompleted Completion checker by session key.
 */
export function refreshDerivedRows(
  state: CalendarRuntimeState,
  isSessionCompleted: (sessionKey: string) => boolean,
): void {
  const calendarState = state;
  const enrichedRows = enrichRows(
    calendarState.rawRows,
    calendarState.totalsByBookId,
    isSessionCompleted,
  );
  calendarState.rows = enrichedRows;
  calendarState.dates = groupRowsByDate(enrichedRows);
  calendarState.months = buildMonthWindow(monthKeysFromRows(enrichedRows));
}

/**
 * Delegates month rendering with required keyboard/selection actions.
 * @param state Mutable calendar runtime state.
 * @param actions Month action callbacks.
 * @param actions.completedBookRowsForDate Returns synthetic rows for books completed on the given day.
 * @param actions.moveSelectionBy Keyboard/grid movement handler.
 * @param actions.renderDetails Details rerender callback.
 * @param actions.selectDate Date selection callback.
 */
export function renderMonth(
  state: CalendarRuntimeState,
  actions: {
    completedBookRowsForDate(dateKey: string): Array<{
      book_id?: string;
      completed?: boolean;
      date?: string;
      finish?: boolean;
      minutes?: number;
      session_index?: string | number;
      title?: string;
    }>;
    moveSelectionBy(delta: number, currentIndex: number): void;
    renderDetails(): void;
    selectDate(dateKey: string, options?: { focus?: boolean }): void;
  },
): void {
  renderCalendarMonth(state, actions);
}

/**
 * Delegates controls rendering for month navigation and today jump.
 * @param state Mutable calendar runtime state.
 * @param rerenderControls Callback to rerender controls.
 * @param rerenderMonth Callback to rerender month grid.
 * @param jumpToToday Callback to focus today's date.
 */
export function renderControls(
  state: CalendarRuntimeState,
  rerenderControls: () => void,
  rerenderMonth: () => void,
  jumpToToday: () => void,
): void {
  renderCalendarControls(state, rerenderControls, rerenderMonth, jumpToToday);
}
