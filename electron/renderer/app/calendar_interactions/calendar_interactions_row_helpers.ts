import type { PlannerScheduleRow } from "../types.js";
import { sessionKeyFor } from "../../calendar/utils.js";

/**
 *
 * @param dateOrRows
 * @param rowsOrDate
 */
function normalizeRowsAndDate(
  dateOrRows: string | PlannerScheduleRow[],
  rowsOrDate: PlannerScheduleRow[] | string,
): { date: string; rows: PlannerScheduleRow[] } {
  if (Array.isArray(dateOrRows)) {
    return {
      date: String(rowsOrDate || ""),
      rows: dateOrRows,
    };
  }
  if (Array.isArray(rowsOrDate)) {
    return {
      date: String(dateOrRows || ""),
      rows: rowsOrDate,
    };
  }
  return { date: String(dateOrRows || ""), rows: [] };
}

/**
 *
 * @param targetSessionKeyOrRows
 * @param rowsOrTargetSessionKey
 */
function normalizeRowsAndSessionKey(
  targetSessionKeyOrRows: string | PlannerScheduleRow[],
  rowsOrTargetSessionKey: PlannerScheduleRow[] | string,
): { key: string; rows: PlannerScheduleRow[] } {
  if (Array.isArray(targetSessionKeyOrRows)) {
    return {
      key: String(rowsOrTargetSessionKey || ""),
      rows: targetSessionKeyOrRows,
    };
  }
  if (Array.isArray(rowsOrTargetSessionKey)) {
    return {
      key: String(targetSessionKeyOrRows || ""),
      rows: rowsOrTargetSessionKey,
    };
  }
  return { key: String(targetSessionKeyOrRows || ""), rows: [] };
}

/**
 *
 * @param dateOrRows
 * @param rowsOrDate
 */
export function nextSessionIndexForDate(
  dateOrRows: string | PlannerScheduleRow[],
  rowsOrDate: PlannerScheduleRow[] | string = [],
): number {
  const normalized = normalizeRowsAndDate(dateOrRows, rowsOrDate);
  let maxIndex = 0;
  normalized.rows.forEach((row) => {
    if (String(row.date || "") !== normalized.date) {
      return;
    }
    const index = Number(row.session_index || 0);
    if (Number.isFinite(index)) {
      maxIndex = Math.max(maxIndex, Math.floor(index));
    }
  });
  return maxIndex + 1;
}

/**
 *
 * @param targetSessionKeyOrRows
 * @param rowsOrTargetSessionKey
 */
export function rowsWithoutSession(
  targetSessionKeyOrRows: string | PlannerScheduleRow[],
  rowsOrTargetSessionKey: PlannerScheduleRow[] | string = [],
): PlannerScheduleRow[] {
  const normalized = normalizeRowsAndSessionKey(
    targetSessionKeyOrRows,
    rowsOrTargetSessionKey,
  );
  if (!normalized.key) {
    return [...normalized.rows];
  }
  return normalized.rows.filter((row) => sessionKeyFor(row) !== normalized.key);
}
