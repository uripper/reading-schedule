import type {
    Book,
    PlannerScheduleRow,
    PlannerSettings,
    UpdatedRowsResult,
} from "../../../types/types.js";
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
    const TARGET_SESSION_KEY = sessionKeyFor(row);
    const ROWS_EXCLUDING_TARGET = rowsWithoutSession(
        TARGET_SESSION_KEY,
        previousRows,
    );
    if (ROWS_EXCLUDING_TARGET.length === previousRows.length) {
        return null;
    }
    const NORMALIZED_MINUTES = normalizedManualMinutes(minutes);
    const BOOK = getBookById(row.book_id);
    const WORDS_PLANNED = wordsPlannedForManualSession({
        bookId: row.book_id,
        difficulty: Number(BOOK?.difficulty ?? DEFAULT_BOOK_DIFFICULTY),
        minutes: NORMALIZED_MINUTES,
        rows: ROWS_EXCLUDING_TARGET,
        settings: collectSettings(),
    });
    const UPDATED_ROW: PlannerScheduleRow = {
        ...row,
        minutes: NORMALIZED_MINUTES,
        words_planned: WORDS_PLANNED,
    };
    return {
        normalizedMinutes: NORMALIZED_MINUTES,
        rows: sortRowsByDateAndSession([...ROWS_EXCLUDING_TARGET, UPDATED_ROW]),
    };
}
