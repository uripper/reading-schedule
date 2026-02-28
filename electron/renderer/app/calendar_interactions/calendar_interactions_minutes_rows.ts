import {
  sessionKeyFor,
  sortRowsByDateAndSession,
} from "../../calendar/utils.js";
import {
  DEFAULT_BOOK_DIFFICULTY,
  normalizedManualMinutes,
  rowsWithoutSession,
  wordsPlannedForManualSession,
} from "./calendar_interactions_helpers.js";
import type {
  Book,
  PlannerScheduleRow,
  PlannerSettings,
  UpdatedRowsResult,
} from "../../../types/types.js";

/**
 * Calculates the updated schedule rows when a session's planned minutes are manually changed.
 * It normalizes the input minutes, recalculates the words planned for that session, and returns the updated rows.
 * @param root0 The input parameters for calculating the updated rows.
 * @param root0.collectSettings Function to collect the current planner settings.
 * @param root0.getBookById Function to retrieve a book by its ID.
 * @param root0.minutes The new planned minutes for the session.
 * @param root0.previousRows The current schedule rows before the update.
 * @param root0.row The specific schedule row that is being updated.
 * @returns An object containing the normalized minutes and the updated schedule rows,
 * or null if the target session was not found.
 */
export function nextRowsWithUpdatedMinutes({
  collectSettings,
  getBookById,
  minutes,
  previousRows,
  row,
}: {
  collectSettings(this: void): PlannerSettings;
  getBookById(this: void, bookId: string): Book | null;
  minutes: number;
  previousRows: PlannerScheduleRow[];
  row: PlannerScheduleRow;
}): UpdatedRowsResult {
  const targetSessionKey = sessionKeyFor(row);
  const rowsExcludingTarget = rowsWithoutSession(
    targetSessionKey,
    previousRows,
  );
  if (rowsExcludingTarget.length === previousRows.length) {
    return null;
  }
  const normalizedMinutes = normalizedManualMinutes(minutes);
  const book = getBookById(row.book_id);
  const wordsPlanned = wordsPlannedForManualSession({
    bookId: row.book_id,
    minutes: normalizedMinutes,
    rows: rowsExcludingTarget,
    settings: collectSettings(),
    difficulty: Number(book?.difficulty ?? DEFAULT_BOOK_DIFFICULTY),
  });
  const updatedRow: PlannerScheduleRow = {
    ...row,
    minutes: normalizedMinutes,
    words_planned: wordsPlanned,
  };
  return {
    normalizedMinutes,
    rows: sortRowsByDateAndSession([...rowsExcludingTarget, updatedRow]),
  };
}
