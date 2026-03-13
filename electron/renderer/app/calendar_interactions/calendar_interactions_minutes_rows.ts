import type {
    Book,
    PlannerScheduleRow,
    PlannerSettings,
    UpdatedRowsResult,
} from "../../../types/types.ts";
import {
    sessionKeyFor,
    sortRowsByDateAndSession,
} from "../../calendar/utils.ts";
import {
    DEFAULT_BOOK_DIFFICULTY,
    normalizedManualMinutes,
    rowsWithoutSession,
    wordsPlannedForManualSession,
} from "./calendar_interactions_helpers.ts";

interface UpdatedMinutesArgs {
    collectSettings(): PlannerSettings;
    getBookById(bookId: string): Book | null;
    normalizedMinutes: number;
    row: PlannerScheduleRow;
    rowsExcludingTarget: PlannerScheduleRow[];
}

function plannedWordsForUpdatedMinutes(args: UpdatedMinutesArgs): number {
    const BOOK = args.getBookById(args.row.book_id);
    return wordsPlannedForManualSession({
        bookId: args.row.book_id,
        difficulty: Number(BOOK?.difficulty ?? DEFAULT_BOOK_DIFFICULTY),
        minutes: args.normalizedMinutes,
        rows: args.rowsExcludingTarget,
        settings: args.collectSettings(),
    });
}

function updatedRowWithMinutes(args: UpdatedMinutesArgs): PlannerScheduleRow {
    return {
        ...args.row,
        minutes: args.normalizedMinutes,
        words_planned: plannedWordsForUpdatedMinutes(args),
    };
}

/**
 * Calculates the updated schedule rows when a session's planned minutes are manually changed.
 * It normalizes the input minutes, recalculates the words planned for that session, and returns the updated rows.
 * @param root0 - The input parameters for calculating the updated rows.
 * @param collectSettings - Function to collect the current planner settings.
 * @param getBookById - Function to retrieve a book by its ID.
 * @param minutes - The new planned minutes for the session.
 * @param previousRows - The current schedule rows before the update.
 * @param row - The specific schedule row that is being updated.
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
    const UPDATED_ROW = updatedRowWithMinutes({
        collectSettings,
        getBookById,
        normalizedMinutes: NORMALIZED_MINUTES,
        row,
        rowsExcludingTarget: ROWS_EXCLUDING_TARGET,
    });
    return {
        normalizedMinutes: NORMALIZED_MINUTES,
        rows: sortRowsByDateAndSession([...ROWS_EXCLUDING_TARGET, UPDATED_ROW]),
    };
}
