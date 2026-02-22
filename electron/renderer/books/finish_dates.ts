import type { PlannerScheduleRow } from "../app/types.js";
import type { Book } from "./types.js";

const SESSION_INDEX_PAD = 3;

/**
 * Builds sortable key for schedule rows using date and padded session index.
 * @param row Planner schedule row.
 * @returns Lexicographically sortable row key.
 */
function rowSortKey(row: PlannerScheduleRow): string {
  const index = String(row.session_index || 0).padStart(SESSION_INDEX_PAD, "0");
  return `${String(row.date || "")}-${index}`;
}

/**
 * Returns schedule rows sorted by date and session index.
 * @param rows Planner schedule rows.
 * @returns Sorted rows copy.
 */
function sortRows(rows: PlannerScheduleRow[] = []): PlannerScheduleRow[] {
  return [...rows].sort((left, right) => {
    return rowSortKey(left).localeCompare(rowSortKey(right));
  });
}

/**
 * Overlays explicit read completion dates onto derived finish-date map.
 * @param finishDateByBookId Derived finish-date lookup map.
 * @param books Books collection with possible `finished_at` values.
 * @returns Finish-date map where explicit read dates take precedence.
 */
function withBookFinishedDates(
  finishDateByBookId: Record<string, string>,
  books: Book[] = [],
): Record<string, string> {
  const out = { ...finishDateByBookId };
  books.forEach((book) => {
    const bookId = String(book?.book_id || "");
    const finishedAt = String(book?.finished_at || "");
    if (!bookId || !finishedAt) {
      return;
    }
    // For read books, explicit completion date should win over schedule estimates.
    out[bookId] = finishedAt;
  });
  return out;
}

/**
 * Builds estimated finish-date lookup keyed by `book_id`.
 * @param rows Planner schedule rows.
 * @param books Books collection used to overlay explicit read dates.
 * @returns Finish-date map for books grid sorting/grouping.
 */
export function finishDatesByBookId(
  rows: PlannerScheduleRow[] = [],
  books: Book[] = [],
): Record<string, string> {
  const out: Record<string, string> = {};
  sortRows(rows).forEach((row) => {
    const bookId = String(row?.book_id || "");
    const date = String(row?.date || "");
    if (!bookId || !date) {
      return;
    }
    out[bookId] = date;
  });
  return withBookFinishedDates(out, books);
}
