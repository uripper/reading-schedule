import type { PlannerScheduleRow } from "../../../types/types.ts";
import { sessionKeyFor } from "../../calendar/utils.ts";

function normalizedRows(
    primary: string | PlannerScheduleRow[],
    fallback: PlannerScheduleRow[] | string,
): PlannerScheduleRow[] {
    if (Array.isArray(primary)) {
        return primary;
    }
    if (Array.isArray(fallback)) {
        return fallback;
    }
    return [];
}

function normalizedStringValue(
    primary: string | PlannerScheduleRow[],
    fallback: PlannerScheduleRow[] | string,
): string {
    let value: string | PlannerScheduleRow[] = primary;
    if (Array.isArray(primary)) {
        value = fallback;
    }
    if (typeof value === "string") {
        return value;
    }
    return "";
}

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
    return {
        date: normalizedStringValue(dateOrRows, rowsOrDate),
        rows: normalizedRows(dateOrRows, rowsOrDate),
    };
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
    return {
        key: normalizedStringValue(
            targetSessionKeyOrRows,
            rowsOrTargetSessionKey,
        ),
        rows: normalizedRows(targetSessionKeyOrRows, rowsOrTargetSessionKey),
    };
}

function sessionIndexForDate(
    date: string,
    row: PlannerScheduleRow,
): number | null {
    if (String(row.date || "") !== date) {
        return null;
    }
    const INDEX = Number(row.session_index || 0);
    if (!Number.isFinite(INDEX)) {
        return null;
    }
    return Math.floor(INDEX);
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
        const INDEX = sessionIndexForDate(NORMALIZED.date, ROW);
        if (INDEX === null) {
            continue;
        }
        maxIndex = Math.max(maxIndex, INDEX);
    }
    return maxIndex + 1;
}

/**
 * Filters out a specific session from the given rows.
 * @param targetSessionKeyOrRows - Either a session key string or an array of PlannerScheduleRow.
 * @param rowsOrTargetSessionKey - Either an array of PlannerScheduleRow or a session key string.
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
