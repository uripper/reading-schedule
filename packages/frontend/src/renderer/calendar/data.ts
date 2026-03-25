import type {
    CalendarRow,
    CalendarRowWithFinish,
    CompletionChecker,
    RowsByDate,
} from "../../types/types.ts";
import { isOnOrAfterDay } from "../app/day_keys_compare.ts";
import { todayDateKey } from "./selection.ts";
import { sessionKeyFor, sortRowsByDateAndSession } from "./utils.ts";

const DAYS_IN_WEEK = 7;

interface FinishRowArgs {
    bookId: string;
    finishedByBookId: Record<string, boolean>;
    nextBookProgress: number;
    totals: Record<string, number>;
}

interface EnrichRowsState {
    finishedByBookId: Record<string, boolean>;
    isSessionCompleted: CompletionChecker;
    progressByBookId: Record<string, number>;
    today: string;
    totals: Record<string, number>;
}

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
function canFinishRow(args: FinishRowArgs): boolean {
    const TOTAL_WORDS = Number(args.totals[args.bookId] || 0);
    return (
        args.bookId !== "" &&
        TOTAL_WORDS > 0 &&
        !args.finishedByBookId[args.bookId] &&
        args.nextBookProgress >= TOTAL_WORDS
    );
}

function isFinishRow(args: FinishRowArgs): boolean {
    if (!canFinishRow(args)) {
        return false;
    }
    const FINISHED_BY_BOOK_ID = args.finishedByBookId;
    FINISHED_BY_BOOK_ID[args.bookId] = true;
    return true;
}

function isCompletedToday(
    row: CalendarRow,
    today: string,
    isSessionCompleted: CompletionChecker,
): boolean {
    const ROW_DATE = String(row.date || "");
    if (ROW_DATE !== today) {
        return false;
    }
    return isSessionCompleted(sessionKeyFor(row));
}

function effectivePlannedWords(
    row: CalendarRow,
    today: string,
    isSessionCompleted: CompletionChecker,
): number {
    if (isCompletedToday(row, today, isSessionCompleted)) {
        return 0;
    }
    return Number(row.words_planned || 0);
}

function unfinishedDisplayRow(row: CalendarRow): CalendarRowWithFinish {
    return { ...row, finish: false };
}

function finishedDisplayRow(
    row: CalendarRow,
    finish: boolean,
): CalendarRowWithFinish {
    return { ...row, finish };
}

function rowFinishState(
    row: CalendarRow,
    state: EnrichRowsState,
    bookId: string,
): boolean {
    const NEXT_BOOK_PROGRESS = nextProgress(
        bookId,
        effectivePlannedWords(row, state.today, state.isSessionCompleted),
        state.progressByBookId,
    );
    return isFinishRow({
        bookId,
        finishedByBookId: state.finishedByBookId,
        nextBookProgress: NEXT_BOOK_PROGRESS,
        totals: state.totals,
    });
}

function enrichRow(
    row: CalendarRow,
    state: EnrichRowsState,
): CalendarRowWithFinish {
    const ROW_DATE = String(row.date || "");
    if (!rowIsPlannedForTodayOrLater(ROW_DATE, state.today)) {
        return unfinishedDisplayRow(row);
    }
    const BOOK_ID = String(row.book_id || "");
    if (isCompletedToday(row, state.today, state.isSessionCompleted)) {
        return unfinishedDisplayRow(row);
    }
    return finishedDisplayRow(row, rowFinishState(row, state, BOOK_ID));
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
    const SORTED_ROWS = sortRowsByDateAndSession(rows);
    const STATE: EnrichRowsState = {
        finishedByBookId: {},
        isSessionCompleted,
        progressByBookId: {},
        today: todayDateKey(),
        totals,
    };
    return SORTED_ROWS.map((row) => enrichRow(row, STATE));
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
        const EXISTING_ROWS = NEXT_ACCUMULATOR[row.date];
        if (EXISTING_ROWS === undefined) {
            return NEXT_ACCUMULATOR;
        }
        EXISTING_ROWS.push(row);
        return NEXT_ACCUMULATOR;
    }, {} as RowsByDate);

    for (const DATE_KEY of Object.keys(GROUPED_ROWS)) {
        const ROWS = GROUPED_ROWS[DATE_KEY];
        if (ROWS === undefined) {
            continue;
        }
        GROUPED_ROWS[DATE_KEY] = rowsWithFinishFirst(ROWS);
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
