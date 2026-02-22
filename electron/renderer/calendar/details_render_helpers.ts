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
 *
 * @param _mode
 */
export function emptyMessageForMode(_mode: DayMode): string {
  return "No sessions planned for this day.";
}

/**
 *
 * @param rows
 * @param mode
 * @param interactionHandlers
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
 *
 * @param mode
 * @param row
 * @param state
 * @param interactionHandlers
 * @param rerenderDetails
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
