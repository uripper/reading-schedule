import {
  enrichRows,
  groupRowsByDate,
  monthKeysFromRows,
} from "./data.js";
import { renderCalendarControls } from "./controls.js";
import { renderCalendarMonth } from "./month.js";
import type { CalendarRuntimeState } from "./state_runtime.js";

export function refreshDerivedRows(
  state: CalendarRuntimeState,
  isSessionCompleted: (sessionKey: string) => boolean,
): void {
  const enrichedRows = enrichRows(state.rawRows, state.totalsByBookId, isSessionCompleted);
  state.rows = enrichedRows;
  state.dates = groupRowsByDate(enrichedRows);
  state.months = monthKeysFromRows(enrichedRows);
}

export function renderMonth(
  state: CalendarRuntimeState,
  actions: {
    moveSelectionBy: (delta: number, currentIndex: number) => void;
    renderDetails: () => void;
    selectDate: (dateKey: string, options?: { focus?: boolean }) => void;
  },
): void {
  renderCalendarMonth(state, actions);
}

export function renderControls(
  state: CalendarRuntimeState,
  rerenderControls: () => void,
  rerenderMonth: () => void,
): void {
  renderCalendarControls(state, rerenderControls, rerenderMonth);
}
