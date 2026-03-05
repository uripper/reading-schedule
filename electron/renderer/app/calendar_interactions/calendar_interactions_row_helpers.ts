import type { PlannerScheduleRow } from "../../../types/types.js";
import { sessionKeyFor } from "../../calendar/utils.js";

/**
 * Normalizes overloaded arguments into a date string and row collection.
 * Supports either `(date, rows)` or `(rows, date)` call order.
 * @param dateOrRows - Either a date string or an array of PlannerScheduleRow.
 * @param rowsOrDate - Either an array of PlannerScheduleRow or a date string.
 * @returns Normalized date/rows pair used by row helper functions.
 */
function normalizeRowsAndDate(
    dateOrRows: string | PlannerScheduleRow[],
    rowsOrDate: PlannerScheduleRow[] | string,
): { date: string; rows: PlannerScheduleRow[] } {
    let rows: PlannerScheduleRow[] = [];
    let dateValue: string | PlannerScheduleRow[] = dateOrRows;
    if (Array.isArray(dateOrRows)) {
        rows = dateOrRows;
        dateValue = rowsOrDate;
    } else if (Array.isArray(rowsOrDate)) {
        rows = rowsOrDate;
    } else {
        rows = [];
    }
    let date = "";
    if (typeof dateValue === "string") {
        date = dateValue;
    }
    return { date, rows };
}

/**
 * Normalizes overloaded arguments into a session key and row collection.
 * Supports either `(sessionKey, rows)` or `(rows, sessionKey)` call order.
 * @param targetSessionKeyOrRows - Either a session key string or an array of PlannerScheduleRow.
 * @param rowsOrTargetSessionKey - Either an array of PlannerScheduleRow or a session key string.
 * @returns Normalized session-key/rows pair used by row helper functions.
 */
function normalizeRowsAndSessionKey(
    targetSessionKeyOrRows: string | PlannerScheduleRow[],
    rowsOrTargetSessionKey: PlannerScheduleRow[] | string,
): { key: string; rows: PlannerScheduleRow[] } {
    let rows: PlannerScheduleRow[] = [];
    let keyValue: string | PlannerScheduleRow[] = targetSessionKeyOrRows;
    if (Array.isArray(targetSessionKeyOrRows)) {
        rows = targetSessionKeyOrRows;
        keyValue = rowsOrTargetSessionKey;
    } else if (Array.isArray(rowsOrTargetSessionKey)) {
        rows = rowsOrTargetSessionKey;
    } else {
        rows = [];
    }
    let key = "";
    if (typeof keyValue === "string") {
        key = keyValue;
    }
    return { key, rows };
}

/**
 * Calculates the next session index for a given date.
 * @param dateOrRows - Either a date string or an array of PlannerScheduleRow.
 * @param rowsOrDate - Either an array of PlannerScheduleRow or a date string.
 * @returns The next session index for the specified date.
 */
export function nextSessionIndexForDate(
    dateOrRows: string | PlannerScheduleRow[],
    rowsOrDate: PlannerScheduleRow[] | string = [],
): number {
    const NORMALIZED = normalizeRowsAndDate(dateOrRows, rowsOrDate);
    let maxIndex = 0;

    for (const ROW of NORMALIZED.rows) {
        if (String(ROW.date || "") !== NORMALIZED.date) {
            continue;
        }
        const INDEX = Number(ROW.session_index || 0);
        if (Number.isFinite(INDEX)) {
            maxIndex = Math.max(maxIndex, Math.floor(INDEX));
        }
    }
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
    const NORMALIZED = normalizeRowsAndSessionKey(
        targetSessionKeyOrRows,
        rowsOrTargetSessionKey,
    );
    if (!NORMALIZED.key) {
        return [...NORMALIZED.rows];
    }
    return NORMALIZED.rows.filter(
        (row) => sessionKeyFor(row) !== NORMALIZED.key,
    );
}
