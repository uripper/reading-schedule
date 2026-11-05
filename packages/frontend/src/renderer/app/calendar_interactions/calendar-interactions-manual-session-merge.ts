/**
 * Keeps one session per book per day when the user adds a manual session.
 * Adding time for a book that is already on that day grows the existing
 * session instead of creating a second row.
 */

import type { PlannerScheduleRow } from "../../../types/types.ts";
import { sessionKeyFor } from "../../calendar/utils.ts";

// audit-allow-local-types: Private result shape for manual-session row merging.
interface ManualSessionRows {
    merged: boolean;
    row: PlannerScheduleRow;
    rows: PlannerScheduleRow[];
}

/** Checks whether two rows are the same book on the same day. */
function sameDayBook(
    left: PlannerScheduleRow,
    right: PlannerScheduleRow,
): boolean {
    return (
        left.date === right.date &&
        String(left.book_id) === String(right.book_id)
    );
}

/** Grows an existing session by the added manual time and locks it. */
function mergedRow(
    existing: PlannerScheduleRow,
    added: PlannerScheduleRow,
): PlannerScheduleRow {
    return {
        ...existing,
        locked: true,
        minutes: Number(existing.minutes || 0) + added.minutes,
        words_planned:
            Number(existing.words_planned || 0) + added.words_planned,
    };
}

/**
 * Adds a manual session row, merging it into the book's existing session
 * for that day when one exists.
 * @param rows - Current schedule rows.
 * @param added - New locked manual session row.
 * @returns Next rows, the resulting session row, and whether it merged.
 */
export function rowsWithManualSession(
    rows: PlannerScheduleRow[],
    added: PlannerScheduleRow,
): ManualSessionRows {
    const EXISTING = rows.find((row) => sameDayBook(row, added));
    if (EXISTING === undefined) {
        return { merged: false, row: added, rows: [...rows, added] };
    }
    const MERGED = mergedRow(EXISTING, added);
    const EXISTING_KEY = sessionKeyFor(EXISTING);
    return {
        merged: true,
        row: MERGED,
        rows: rows.map((row) => {
            if (sessionKeyFor(row) === EXISTING_KEY) {
                return MERGED;
            }
            return row;
        }),
    };
}
