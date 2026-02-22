import {
  enrichRows,
  groupRowsByDate,
  monthKeysFromRows,
} from "./data.js";
import { renderCalendarControls } from "./controls.js";
import { renderCalendarMonth } from "./month.js";
import type { CalendarRuntimeState } from "./state_runtime.js";

/**
 *
 * @param state
 * @param isSessionCompleted
 */
export function refreshDerivedRows(
  state: CalendarRuntimeState,
  isSessionCompleted: (sessionKey: string) => boolean,
): void {
  const enrichedRows = enrichRows(state.rawRows, state.totalsByBookId, isSessionCompleted);
  state.rows = enrichedRows;
  state.dates = groupRowsByDate(enrichedRows);
  state.months = monthKeysFromRows(enrichedRows);
}

/**
 *
 * @param state
 * @param actions
 * @param actions.moveSelectionBy
 * @param actions.renderDetails
 * @param actions.selectDate
 */
export function renderMonth(
  state: CalendarRuntimeState,
  actions: {
    moveSelectionBy(delta: number, currentIndex: number): void;
    renderDetails(): void;
    selectDate(dateKey: string, options?: { focus?: boolean }): void;
  },
): void {
  renderCalendarMonth(state, actions);
}

/**
 *
 * @param state
 * @param rerenderControls
 * @param rerenderMonth
 * @param jumpToToday
 */
export function renderControls(
  state: CalendarRuntimeState,
  rerenderControls: () => void,
  rerenderMonth: () => void,
  jumpToToday: () => void,
): void {
  renderCalendarControls(state, rerenderControls, rerenderMonth, jumpToToday);
}
