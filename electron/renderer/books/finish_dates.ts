
import type { PlannerScheduleRow } from '../app/types.js';

const SESSION_INDEX_PAD = 3;

function rowSortKey(row: PlannerScheduleRow): string {
  const index = String(row.session_index || 0).padStart(SESSION_INDEX_PAD, "0");
  return `${String(row.date || "")}-${index}`;
}

function sortRows(rows: PlannerScheduleRow[] = []): PlannerScheduleRow[] {
  return [...rows].sort((left, right) => {
    return rowSortKey(left).localeCompare(rowSortKey(right));
  });
}

export function finishDatesByBookId(rows: PlannerScheduleRow[] = []): Record<string, string> {
  const out: Record<string, string> = {};
  sortRows(rows).forEach((row) => {
    const bookId = String(row?.book_id || "");
    const date = String(row?.date || "");
    if (!bookId || !date) {
      return;
    }
    out[bookId] = date;
  });
  return out;
}
