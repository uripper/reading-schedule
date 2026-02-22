import { rowsWithFinishFirst, type CalendarRowWithFinish } from "./data.js";
import {
  buildFutureSessionItem,
  buildPastSessionItem,
  buildTodaySessionItem,
  rowsWithCompletedLast,
  type DayMode,
  type DetailInteractionHandlers,
} from "./details_helpers.js";
import type { CalendarStateSubset } from "./details_types.js";

export type CalendarDetailsState = CalendarStateSubset & {
  selectedDate: string;
  dates: Record<string, CalendarRowWithFinish[]>;
  expectedFinishHighlightDate: string;
};

/**
 * Returns empty-state message for day details panel by mode.
 * @param _mode Day mode.
 * @returns Empty-state message.
 */
export function emptyMessageForMode(_mode: DayMode): string {
  return "No sessions planned for this day.";
}

/**
 * Selects row ordering strategy for details mode.
 * @param rows Day rows.
 * @param mode Day mode.
 * @param interactionHandlers Detail interaction handlers.
 * @returns Rows ordered for display.
 */
export function rowsForMode(
  rows: CalendarRowWithFinish[],
  mode: DayMode,
  interactionHandlers: DetailInteractionHandlers,
): CalendarRowWithFinish[] {
  if (mode === "past") {
    return rowsWithCompletedLast(rows, interactionHandlers);
  }
  if (mode === "today") {
    return rowsWithCompletedLast(rows, interactionHandlers);
  }
  return rowsWithFinishFirst(rows);
}

/**
 * Builds the proper row node for current day mode.
 * @param mode Day mode.
 * @param row Calendar row.
 * @param state Calendar details state.
 * @param interactionHandlers Detail interaction handlers.
 * @param rerenderDetails Details rerender callback.
 * @returns Rendered row element.
 */
export function rowNodeForMode(
  mode: DayMode,
  row: CalendarRowWithFinish,
  state: CalendarDetailsState,
  interactionHandlers: DetailInteractionHandlers,
  rerenderDetails: () => void,
): HTMLElement {
  if (mode === "today") {
    return buildTodaySessionItem(row, state, interactionHandlers, rerenderDetails);
  }
  if (mode === "future") {
    return buildFutureSessionItem(
      row,
      state,
      interactionHandlers,
      rerenderDetails,
    );
  }
  return buildPastSessionItem(row, interactionHandlers, rerenderDetails);
}
