import { rowsWithFinishFirst, type CalendarRowWithFinish } from "./data.js";
import { sessionKeyFor } from "./utils.js";
import type { DayMode, DetailInteractionHandlers } from "./details_types.js";

/**
 *
 */
function todayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 *
 * @param dateKey
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
 *
 * @param rows
 * @param interactionHandlers
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
