import type {
    Book,
    PlannerResult,
    PlannerScheduleRow,
    TodayBookSummary,
    TodayScheduleSnapshot,
} from "../../../types/types.js";
import { bookCoverSrc } from "../../books/model.js";
import { titleSortKey } from "../../books/title_key.js";
import {
    sessionKeyFor,
    sortRowsByDateAndSession,
} from "../../calendar/utils.js";
import { todayKey } from "../../sessions/utils.js";
import { isOnOrAfterDay } from "../day_keys_compare.js";

const ZERO_COUNT = 0;
const DEFAULT_TITLE = "Untitled";

/**
 * Returns sorted planned rows from planner result data.
 * @param lastResult Latest planner result.
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
 * @param row Planned schedule row.
 * @param scheduleCompletions Completion map keyed by session identity.
 * @returns True when row is completed.
 */
function isCompletedRow(
    row: PlannerScheduleRow,
    scheduleCompletions: Record<string, boolean>,
): boolean {
    return Boolean(scheduleCompletions[sessionKeyFor(row)]);
}

/**
 * Builds a map of books keyed by non-empty book id.
 * @param books Source book catalog.
 * @returns Map of book id to book model.
 */
function booksById(books: Book[]): Map<string, Book> {
    const BY_ID = new Map<string, Book>();

    books.forEach((book) => {
        const BOOK_ID = String(book.book_id || "").trim();
        if (!BOOK_ID) {
            return;
        }
        BY_ID.set(BOOK_ID, book);
    });
    return BY_ID;
}

/**
 * Compares titles using normalized sort keys with stable fallback.
 * @param left Left title.
 * @param right Right title.
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
 * @param row First row encountered for the book.
 * @param bookById Catalog lookup keyed by book id.
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

/**
 * Finds the next uncompleted planned row on or after today.
 * @param lastResult Latest planner result.
 * @param scheduleCompletions Completion map keyed by session identity.
 * @returns Next uncompleted row, or null when none remain.
 */
function nextUncompletedPlannedRow(
    lastResult: PlannerResult | null,
    scheduleCompletions: Record<string, boolean>,
): PlannerScheduleRow | null {
    const TODAY = todayKey();
    const ROWS = rowsFromResult(lastResult);
    for (const ROW of ROWS) {
        const ROW_DATE = String(ROW.date || "");
        if (
            isOnOrAfterDay(ROW_DATE, TODAY) &&
            !isCompletedRow(ROW, scheduleCompletions)
        ) {
            return ROW;
        }
    }
    return null;
}

/**
 * Builds aggregate Today schedule metrics and book-level summaries.
 * @param lastResult Latest planner result.
 * @param scheduleCompletions Completion map keyed by session identity.
 * @param books Current book catalog used for cover/title metadata.
 * @returns Snapshot used by Today dashboard rendering.
 */
export function buildTodayScheduleSnapshot(
    lastResult: PlannerResult | null,
    scheduleCompletions: Record<string, boolean>,
    books: Book[] = [],
): TodayScheduleSnapshot {
    const TODAY = todayKey();
    const ROW_LIST = rowsFromResult(lastResult);
    const BOOKS_MAP = booksById(books);
    const SUMMARIES_BY_BOOK_ID = new Map<string, TodayBookSummary>();

    let completedPlannedMinutes = ZERO_COUNT;
    let scheduledSessions = ZERO_COUNT;
    let completedSessions = ZERO_COUNT;

    ROW_LIST.forEach((row) => {
        const ROW_DATE = String(row.date || "");
        if (ROW_DATE !== TODAY) {
            return;
        }

        const COMPLETED = isCompletedRow(row, scheduleCompletions);
        const BOOK_ID = String(row.book_id || "").trim();
        let summary = SUMMARIES_BY_BOOK_ID.get(BOOK_ID);
        if (!summary) {
            summary = createBookSummary(row, BOOKS_MAP);
            SUMMARIES_BY_BOOK_ID.set(BOOK_ID, summary);
        }

        const PLANNED_MINUTES = Number(row.minutes || ZERO_COUNT);
        summary.scheduledSessions += 1;
        summary.plannedMinutes += PLANNED_MINUTES;
        scheduledSessions += 1;
        if (!COMPLETED) {
            return;
        }
        summary.completedSessions += 1;
        completedSessions += 1;
        completedPlannedMinutes += PLANNED_MINUTES;
    });

    const BOOKS_FOR_TODAY = [...SUMMARIES_BY_BOOK_ID.values()];
    BOOKS_FOR_TODAY.sort((left, right) => {
        return compareTitle(left.title, right.title);
    });

    return {
        books: BOOKS_FOR_TODAY,
        completedPlannedMinutes,
        completedSessions,
        nextUncompletedRow: nextUncompletedPlannedRow(
            lastResult,
            scheduleCompletions,
        ),
        scheduledSessions,
    };
}
