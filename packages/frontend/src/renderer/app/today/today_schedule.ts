import type {
    Book,
    PlannerResult,
    PlannerScheduleRow,
    TodayBookSummary,
    TodayScheduleSnapshot,
} from "../../../types/types.ts";
import { bookCoverSrc } from "../../books/model-normalize.ts";
import { titleSortKey } from "../../books/title_key.ts";
import {
    sessionKeyFor,
    sortRowsByDateAndSession,
} from "../../calendar/utils.ts";
import { todayKey } from "../../sessions/utils.ts";
import { isOnOrAfterDay } from "../day_keys_compare.ts";
import { bookByIdIndex } from "../state_indexes.ts";

const ZERO_COUNT = 0;
const DEFAULT_TITLE = "Untitled";

/**
 * Returns sorted planned rows from planner result data.
 * @param lastResult - Latest planner result.
 * @returns Planned rows sorted by day and session order.
 */
function rowsFromResult(
    lastResult: PlannerResult | null,
): PlannerScheduleRow[] {
    if (!Array.isArray(lastResult?.schedule)) {
        return [];
    }
    return sortRowsByDateAndSession(lastResult.schedule);
}

/**
 * Checks whether a planned row is marked complete in completion map.
 * @param row - Planned schedule row.
 * @param scheduleCompletions - Completion map keyed by session identity.
 * @returns True when row is completed.
 */
function isCompletedRow(
    row: PlannerScheduleRow,
    scheduleCompletions: Record<string, boolean>,
): boolean {
    return Boolean(scheduleCompletions[sessionKeyFor(row)]);
}

/**
 * Compares titles using normalized sort keys with stable fallback.
 * @param left - Left title.
 * @param right - Right title.
 * @returns Locale comparison result.
 */
function compareTitle(left: string, right: string): number {
    const LEFT_KEY = titleSortKey(left);
    const RIGHT_KEY = titleSortKey(right);
    const BY_KEY = LEFT_KEY.localeCompare(RIGHT_KEY, undefined, {
        sensitivity: "base",
    });
    if (BY_KEY !== ZERO_COUNT) {
        return BY_KEY;
    }
    return left.localeCompare(right, undefined, { sensitivity: "base" });
}

/**
 * Creates a mutable per-book summary accumulator for today's rows.
 * @param row - First row encountered for the book.
 * @param bookById - Catalog lookup keyed by book id.
 * @returns Initialized summary object for the book.
 */
function createBookSummary(
    row: PlannerScheduleRow,
    bookById: Map<string, Book>,
): TodayBookSummary {
    const TITLE = String(row.title || DEFAULT_TITLE);
    const BOOK_ID = String(row.book_id || "").trim();
    let coverSrc = "";
    const MATCHED = bookById.get(BOOK_ID);
    if (MATCHED) {
        coverSrc = bookCoverSrc(MATCHED);
    }
    return {
        bookId: BOOK_ID,
        completedSessions: ZERO_COUNT,
        coverSrc,
        plannedMinutes: ZERO_COUNT,
        scheduledSessions: ZERO_COUNT,
        title: TITLE,
    };
}

interface TodayScheduleAccumulator {
    completedPlannedMinutes: number;
    completedSessions: number;
    scheduledSessions: number;
    summariesByBookId: Map<string, TodayBookSummary>;
}

function createTodayScheduleAccumulator(): TodayScheduleAccumulator {
    return {
        completedPlannedMinutes: ZERO_COUNT,
        completedSessions: ZERO_COUNT,
        scheduledSessions: ZERO_COUNT,
        summariesByBookId: new Map<string, TodayBookSummary>(),
    };
}

function summaryForBook(
    accumulator: TodayScheduleAccumulator,
    row: PlannerScheduleRow,
    booksMap: Map<string, Book>,
): TodayBookSummary {
    const BOOK_ID = String(row.book_id || "").trim();
    const EXISTING = accumulator.summariesByBookId.get(BOOK_ID);
    if (EXISTING !== undefined) {
        return EXISTING;
    }
    const CREATED = createBookSummary(row, booksMap);
    accumulator.summariesByBookId.set(BOOK_ID, CREATED);
    return CREATED;
}

function applyTodayRow(options: {
    accumulator: TodayScheduleAccumulator;
    booksMap: Map<string, Book>;
    row: PlannerScheduleRow;
    scheduleCompletions: Record<string, boolean>;
}): void {
    const ACCUMULATOR = options.accumulator;
    const SUMMARY = summaryForBook(ACCUMULATOR, options.row, options.booksMap);
    const PLANNED_MINUTES = Number(options.row.minutes || ZERO_COUNT);
    SUMMARY.scheduledSessions += 1;
    SUMMARY.plannedMinutes += PLANNED_MINUTES;
    ACCUMULATOR.scheduledSessions += 1;
    if (!isCompletedRow(options.row, options.scheduleCompletions)) {
        return;
    }
    SUMMARY.completedSessions += 1;
    ACCUMULATOR.completedSessions += 1;
    ACCUMULATOR.completedPlannedMinutes += PLANNED_MINUTES;
}

function accumulateTodaySchedule(options: {
    booksMap: Map<string, Book>;
    rows: PlannerScheduleRow[];
    scheduleCompletions: Record<string, boolean>;
    today: string;
}): TodayScheduleAccumulator {
    const ACCUMULATOR = createTodayScheduleAccumulator();
    for (const ROW of options.rows) {
        if (String(ROW.date || "") !== options.today) {
            continue;
        }
        applyTodayRow({
            accumulator: ACCUMULATOR,
            booksMap: options.booksMap,
            row: ROW,
            scheduleCompletions: options.scheduleCompletions,
        });
    }
    return ACCUMULATOR;
}

function sortedBookSummaries(
    summariesByBookId: Map<string, TodayBookSummary>,
): TodayBookSummary[] {
    const BOOKS_FOR_TODAY = [...summariesByBookId.values()];
    BOOKS_FOR_TODAY.sort((left, right) => {
        return compareTitle(left.title, right.title);
    });
    return BOOKS_FOR_TODAY;
}

function isNextUncompletedRow(
    row: PlannerScheduleRow,
    scheduleCompletions: Record<string, boolean>,
    today: string,
): boolean {
    const ROW_DATE = String(row.date || "");
    if (!isOnOrAfterDay(ROW_DATE, today)) {
        return false;
    }
    return !isCompletedRow(row, scheduleCompletions);
}

/**
 * Finds the next uncompleted planned row on or after today.
 * @param lastResult - Latest planner result.
 * @param scheduleCompletions - Completion map keyed by session identity.
 * @returns Next uncompleted row, or null when none remain.
 */
export function nextUncompletedPlannedRow(
    lastResult: PlannerResult | null,
    scheduleCompletions: Record<string, boolean>,
): PlannerScheduleRow | null {
    const TODAY = todayKey();
    const ROWS = rowsFromResult(lastResult);
    for (const ROW of ROWS) {
        if (isNextUncompletedRow(ROW, scheduleCompletions, TODAY)) {
            return ROW;
        }
    }
    return null;
}

/**
 * Builds aggregate Today schedule metrics and book-level summaries.
 * @param lastResult - Latest planner result.
 * @param scheduleCompletions - Completion map keyed by session identity.
 * @param books - Current book catalog used for cover/title metadata.
 * @returns Snapshot used by Today dashboard rendering.
 */
export function buildTodayScheduleSnapshot(
    lastResult: PlannerResult | null,
    scheduleCompletions: Record<string, boolean>,
    books: Book[] = [],
): TodayScheduleSnapshot {
    const TODAY = todayKey();
    const ACCUMULATOR = accumulateTodaySchedule({
        booksMap: bookByIdIndex(books),
        rows: rowsFromResult(lastResult),
        scheduleCompletions,
        today: TODAY,
    });

    return {
        books: sortedBookSummaries(ACCUMULATOR.summariesByBookId),
        completedPlannedMinutes: ACCUMULATOR.completedPlannedMinutes,
        completedSessions: ACCUMULATOR.completedSessions,
        nextUncompletedRow: nextUncompletedPlannedRow(
            lastResult,
            scheduleCompletions,
        ),
        scheduledSessions: ACCUMULATOR.scheduledSessions,
    };
}
