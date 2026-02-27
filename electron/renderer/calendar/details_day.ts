import { rowsWithFinishFirst } from "./data.js";
import { sessionKeyFor } from "./utils.js";
import type {
  CalendarRowWithFinish,
  DayMode,
  DetailInteractionHandlers,
} from "../../types/types_calendar.js";

/**
 * Creates a local date key (`YYYY-MM-DD`) for the current day.
 * @returns Date key for "today" in local time.
 */
function todayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Categorizes a date relative to today for day-detail UI behavior.
 * @param dateKey Day key in `YYYY-MM-DD` format.
 * @returns Whether the day is in the past, today, or future.
 */
export function dayMode(dateKey: string): DayMode {
  const today = todayDateKey();
  if (dateKey < today) {
    return "past";
  }
  if (dateKey > today) {
    return "future";
  }
  return "today";
}

/**
 * Sorts rows with unfinished sessions first and completed sessions last.
 * @param rows Rows for a single day before completion-based ordering.
 * @param interactionHandlers Completion lookup handlers for session rows.
 * @returns Rows grouped by completion state, with finish-priority sorting in each group.
 */
export function rowsWithCompletedLast(
  rows: CalendarRowWithFinish[],
  interactionHandlers: DetailInteractionHandlers,
): CalendarRowWithFinish[] {
  const incompleteRows: CalendarRowWithFinish[] = [];
  const completeRows: CalendarRowWithFinish[] = [];
  rows.forEach((row) => {
    const complete = Boolean(
      interactionHandlers.isSessionCompleted(sessionKeyFor(row)),
    );
    if (complete) {
      completeRows.push(row);
      return;
    }
    incompleteRows.push(row);
  });
  return [
    ...rowsWithFinishFirst(incompleteRows),
    ...rowsWithFinishFirst(completeRows),
  ];
}
