import { sessionKeyFor, sortRowsByDateAndSession } from "../calendar/utils.js";
import type { Book } from "../books/types.js";
import {
  DEFAULT_BOOK_DIFFICULTY,
  normalizedManualMinutes,
  rowsWithoutSession,
  wordsPlannedForManualSession,
} from "./calendar_interactions_helpers.js";
import type { PlannerScheduleRow, PlannerSettings } from "./types.js";

export type UpdatedRowsResult = {
  normalizedMinutes: number;
  rows: PlannerScheduleRow[];
} | null;

export function nextRowsWithUpdatedMinutes({
  collectSettings,
  getBookById,
  minutes,
  previousRows,
  row,
}: {
  collectSettings: () => PlannerSettings;
  getBookById: (bookId: string) => Book | null;
  minutes: number;
  previousRows: PlannerScheduleRow[];
  row: PlannerScheduleRow;
}): UpdatedRowsResult {
  const targetSessionKey = sessionKeyFor(row);
  const rowsExcludingTarget = rowsWithoutSession(targetSessionKey, previousRows);
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
    difficulty: Number(book?.difficulty || DEFAULT_BOOK_DIFFICULTY),
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
