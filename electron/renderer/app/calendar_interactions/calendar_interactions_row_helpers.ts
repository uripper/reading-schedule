import type { PlannerScheduleRow } from "../types.js";
import { sessionKeyFor } from "../../calendar/utils.js";

/**
 * Normalizes input to extract date and rows for session index calculation.
 * @param dateOrRows Either a date string or an array of PlannerScheduleRow.
 * @param rowsOrDate Either an array of PlannerScheduleRow or a date string.
 * @returns An object containing the date and rows for the specified date.
 */
function normalizeRowsAndDate(
  dateOrRows: string | PlannerScheduleRow[],
  rowsOrDate: PlannerScheduleRow[] | string,
): { date: string; rows: PlannerScheduleRow[] } {
  if (Array.isArray(dateOrRows)) {
    let date = "";
    if (typeof rowsOrDate === "string") {
      date = String(rowsOrDate);
    }
    return {
      date,
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
 * Normalizes input to extract a session key and rows for session filtering.
 * @param targetSessionKeyOrRows Either a session key string or an array of PlannerScheduleRow.
 * @param rowsOrTargetSessionKey Either an array of PlannerScheduleRow or a session key string.
 * @returns An object containing the session key and rows for filtering out the specified session.
 */
function normalizeRowsAndSessionKey(
  targetSessionKeyOrRows: string | PlannerScheduleRow[],
  rowsOrTargetSessionKey: PlannerScheduleRow[] | string,
): { key: string; rows: PlannerScheduleRow[] } {
  let key = "";
  if (Array.isArray(targetSessionKeyOrRows)) {
    if (typeof rowsOrTargetSessionKey === "string") {
      key = rowsOrTargetSessionKey;
    }
    return {
      key,
      rows: targetSessionKeyOrRows,
    };
  }
  if (Array.isArray(rowsOrTargetSessionKey)) {
    if (typeof targetSessionKeyOrRows === "string") {
      key = targetSessionKeyOrRows;
    }
    return {
      key,
      rows: rowsOrTargetSessionKey,
    };
  }
  if (typeof targetSessionKeyOrRows === "string") {
    key = targetSessionKeyOrRows;
  }
  return { key, rows: [] };
}

/**
 * Calculates the next session index for a given date.
 * @param dateOrRows Either a date string or an array of PlannerScheduleRow.
 * @param rowsOrDate Either an array of PlannerScheduleRow or a date string.
 * @returns The next session index for the specified date.
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
 * Filters out a specific session from the given rows.
 * @param targetSessionKeyOrRows Either a session key string or an array of PlannerScheduleRow.
 * @param rowsOrTargetSessionKey Either an array of PlannerScheduleRow or a session key string.
 * @returns An array of PlannerScheduleRow excluding the specified session.
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
