import type {
    CalendarRow,
    CalendarRowWithFinish,
    CompletionChecker,
    RowsByDate,
} from "../../types/types.js";
import { isOnOrAfterDay } from "../app/day_keys_compare.js";
import { todayDateKey } from "./selection.js";
import { sessionKeyFor, sortRowsByDateAndSession } from "./utils.js";

const DAYS_IN_WEEK = 7;

/**
 * Checks whether a row date is today or in the future.
 * @param rowDate - Row day key.
 * @param today - Current day key.
 * @returns `true` when row is today/future and should affect finish estimates.
 */
function rowIsPlannedForTodayOrLater(rowDate: string, today: string): boolean {
    return isOnOrAfterDay(rowDate, today);
}

/**
 * Applies planned words to per-book running progress accumulator.
 * @param bookId - Book id to update.
 * @param plannedWords - Words planned in current row.
 * @param progressByBookId - Mutable progress accumulator map.
 * @returns Updated cumulative progress for the book.
 */
function nextProgress(
    bookId: string,
    plannedWords: number,
    progressByBookId: Record<string, number>,
): number {
    const NEXT_PROGRESS_BY_BOOK_ID = progressByBookId;
    const PREVIOUS_PROGRESS = Number(NEXT_PROGRESS_BY_BOOK_ID[bookId] || 0);
    const NEXT = PREVIOUS_PROGRESS + plannedWords;
    NEXT_PROGRESS_BY_BOOK_ID[bookId] = NEXT;
    return NEXT;
}

/**
 * Determines whether current row is the first row that finishes a book.
 * @param bookId - Book id being evaluated.
 * @param nextBookProgress - Cumulative progress after current row.
 * @param totals - Total words per book.
 * @param finishedByBookId - Mutable map tracking books already marked finished.
 * @returns `true` when this row should receive finish badge.
 */
function isFinishRow(
    bookId: string,
    nextBookProgress: number,
    totals: Record<string, number>,
    finishedByBookId: Record<string, boolean>,
): boolean {
    const NEXT_FINISHED_BY_BOOK_ID = finishedByBookId;
    if (!bookId) {
        return false;
    }
    const TOTAL_WORDS = Number(totals[bookId] || 0);
    if (TOTAL_WORDS <= 0) {
        return false;
    }
    if (NEXT_FINISHED_BY_BOOK_ID[bookId]) {
        return false;
    }
    if (nextBookProgress < TOTAL_WORDS) {
        return false;
    }
    NEXT_FINISHED_BY_BOOK_ID[bookId] = true;
    return true;
}

/**
 * Enriches rows with finish flags used by calendar row rendering.
 * @param rows - Raw schedule rows.
 * @param totals - Total words per book.
 * @param isSessionCompleted - Completion state checker by session key.
 * @returns Rows sorted and annotated with `finish` flag.
 */
export function enrichRows(
    rows: CalendarRow[],
    totals: Record<string, number> = {},
    isSessionCompleted: CompletionChecker = () => false,
): CalendarRowWithFinish[] {
    const PROGRESS_BY_BOOK_ID: Record<string, number> = {};
    const FINISHED_BY_BOOK_ID: Record<string, boolean> = {};
    const SORTED_ROWS = sortRowsByDateAndSession(rows);
    const TODAY = todayDateKey();
    return SORTED_ROWS.map((row) => {
        const ROW_DATE = String(row.date || "");
        if (!rowIsPlannedForTodayOrLater(ROW_DATE, TODAY)) {
            return { ...row, finish: false };
        }
        const BOOK_ID = String(row.book_id || "");
        const PLANNED_WORDS = Number(row.words_planned || 0);
        const SESSION_KEY = sessionKeyFor(row);
        const COMPLETED_TODAY =
            ROW_DATE === TODAY && isSessionCompleted(SESSION_KEY);
        let effectivePlannedWords = PLANNED_WORDS;
        if (COMPLETED_TODAY) {
            effectivePlannedWords = 0;
        }
        const NEXT_BOOK_PROGRESS = nextProgress(
            BOOK_ID,
            effectivePlannedWords,
            PROGRESS_BY_BOOK_ID,
        );
        const FINISHES_BOOK = isFinishRow(
            BOOK_ID,
            NEXT_BOOK_PROGRESS,
            totals,
            FINISHED_BY_BOOK_ID,
        );
        if (COMPLETED_TODAY) {
            return { ...row, finish: false };
        }
        return { ...row, finish: FINISHES_BOOK };
    });
}

/**
 * Returns rows reordered so finish rows appear first within a day.
 * @param rows - Rows for a single date.
 * @returns Rows with finish rows moved to front.
 */
export function rowsWithFinishFirst(
    rows: CalendarRowWithFinish[] = [],
): CalendarRowWithFinish[] {
    const FINISH_ROWS: CalendarRowWithFinish[] = [];
    const OTHER_ROWS: CalendarRowWithFinish[] = [];

    for (const ROW of rows) {
        if (ROW.finish === true) {
            FINISH_ROWS.push(ROW);
            continue;
        }
        OTHER_ROWS.push(ROW);
    }
    return [...FINISH_ROWS, ...OTHER_ROWS];
}

/**
 * Groups enriched calendar rows by date key.
 * @param rows - Enriched rows.
 * @returns Rows grouped by date with finish-first ordering per day.
 */
export function groupRowsByDate(
    rows: CalendarRowWithFinish[] = [],
): RowsByDate {
    const GROUPED_ROWS = rows.reduce((accumulator, row) => {
        const NEXT_ACCUMULATOR = accumulator;
        if (!(row.date in NEXT_ACCUMULATOR)) {
            NEXT_ACCUMULATOR[row.date] = [];
        }
        NEXT_ACCUMULATOR[row.date].push(row);
        return NEXT_ACCUMULATOR;
    }, {} as RowsByDate);

    for (const DATE_KEY of Object.keys(GROUPED_ROWS)) {
        GROUPED_ROWS[DATE_KEY] = rowsWithFinishFirst(GROUPED_ROWS[DATE_KEY]);
    }
    return GROUPED_ROWS;
}

/**
 * Extracts sorted unique month keys from enriched rows.
 * @param rows - Enriched rows.
 * @returns Sorted month keys in `YYYY-MM` format.
 */
export function monthKeysFromRows(
    rows: CalendarRowWithFinish[] = [],
): string[] {
    const MONTH_KEY_SET = new Set(
        rows.map((row) => row.date.slice(0, DAYS_IN_WEEK)),
    );
    return [...MONTH_KEY_SET].sort((left, right) => left.localeCompare(right));
}
