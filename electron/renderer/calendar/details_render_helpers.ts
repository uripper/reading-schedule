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

export function emptyMessageForMode(_mode: DayMode): string {
  return "No sessions planned for this day.";
}

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
