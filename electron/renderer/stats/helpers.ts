import {
    type Book,
    type PlannerResult,
    type StatusBreakdown,
} from "../../types/types.js";
import { finishDatesByBookId } from "../books/finish_dates.js";
import {
    BOOK_STATUS_DROPPED,
    BOOK_STATUS_IN_PROGRESS,
    BOOK_STATUS_READ,
    BOOK_STATUS_TO_READ,
} from "../books/status_catalog.js";
import { sessionKeyFor } from "../calendar/utils.js";
import { todayKey } from "../sessions/utils.js";

const MONTHS_PER_YEAR = 12;
const PERCENT_MAX = 100;
const DATE_YEAR_START_INDEX = 0;
const DATE_YEAR_END_INDEX = 4;
const DATE_MONTH_START_INDEX = 5;
const DATE_MONTH_END_INDEX = 7;
const MIN_MONTH_NUMBER = 1;
const MONTH_NUMBER_TO_INDEX_OFFSET = 1;

/**
 * Parses year component from a `YYYY-MM-DD` date key.
 * @param dateText Date key text.
 * @returns Parsed year, or null when invalid.
 */
export function yearFromDateKey(dateText: string): number | null {
    const KEY = String(dateText || "").trim();
    if (KEY.length < DATE_YEAR_END_INDEX) {
        return null;
    }
    const PARSED = Number(
        KEY.slice(DATE_YEAR_START_INDEX, DATE_YEAR_END_INDEX),
    );
    if (!Number.isInteger(PARSED)) {
        return null;
    }
    return PARSED;
}

/**
 * Parses zero-based month index from a `YYYY-MM-DD` date key.
 * @param dateText Date key text.
 * @returns Month index in `[0, 11]`, or null when invalid.
 */
export function monthIndexFromDateKey(dateText: string): number | null {
    const KEY = String(dateText || "").trim();
    const PARSED = Number(
        KEY.slice(DATE_MONTH_START_INDEX, DATE_MONTH_END_INDEX),
    );
    if (!Number.isInteger(PARSED)) {
        return null;
    }
    if (PARSED < MIN_MONTH_NUMBER || PARSED > MONTHS_PER_YEAR) {
        return null;
    }
    return PARSED - MONTH_NUMBER_TO_INDEX_OFFSET;
}

/**
 * Counts books by status for dashboard status distribution.
 * @param books Book catalog.
 * @returns Status-to-count breakdown.
 */
export function statusBreakdown(books: Book[]): StatusBreakdown {
    const COUNTS: StatusBreakdown = {
        [BOOK_STATUS_TO_READ]: 0,
        [BOOK_STATUS_IN_PROGRESS]: 0,
        [BOOK_STATUS_READ]: 0,
        [BOOK_STATUS_DROPPED]: 0,
    };
    books.forEach((book) => {
        COUNTS[book.status] += 1;
    });
    return COUNTS;
}

/**
 * Collects ids of books marked read and finished in the target year.
 * @param books Book catalog.
 * @param year Target year.
 * @returns Set of read book ids finished that year.
 */
export function readBooksFinishedThisYear(
    books: Book[],
    year: number,
): Set<string> {
    const IDS = new Set<string>();
    books.forEach((book) => {
        if (book.status !== BOOK_STATUS_READ) {
            return;
        }
        const FINISHED_YEAR = yearFromDateKey(String(book.finished_at ?? ""));
        if (FINISHED_YEAR !== year) {
            return;
        }
        IDS.add(book.book_id);
    });
    return IDS;
}

/**
 * Collects planned finish ids/months from planner output for a target year.
 * @param lastResult Latest planner result.
 * @param year Target year.
 * @returns Planned finish ids and month index map keyed by book id.
 */
export function plannedFinishBookIds(
    lastResult: PlannerResult | null,
    year: number,
): { ids: Set<string>; monthByBookId: Map<string, number> } {
    const IDS = new Set<string>();
    const MONTH_BY_BOOK_ID = new Map<string, number>();
    const ROWS = lastResult?.schedule ?? [];
    const BY_BOOK_ID = finishDatesByBookId(ROWS);
    const PER_BOOK_SUMMARY = lastResult?.summary?.per_book ?? {};

    Object.entries(BY_BOOK_ID).forEach(([bookId, dateKey]) => {
        const FINISH_YEAR = yearFromDateKey(dateKey);
        if (FINISH_YEAR !== year) {
            return;
        }
        if (Object.hasOwn(PER_BOOK_SUMMARY, bookId)) {
            const SUMMARY = PER_BOOK_SUMMARY[bookId];
            if (SUMMARY.finished === false) {
                return;
            }
        }
        const MONTH_INDEX = monthIndexFromDateKey(dateKey);
        if (MONTH_INDEX === null) {
            return;
        }
        IDS.add(bookId);
        MONTH_BY_BOOK_ID.set(bookId, MONTH_INDEX);
    });
    return { ids: IDS, monthByBookId: MONTH_BY_BOOK_ID };
}

/**
 * Computes completion-rate stats for rows scheduled through today in target year.
 * @param lastResult Latest planner result.
 * @param scheduleCompletions Completion map keyed by schedule row.
 * @param year Target year.
 * @returns Scheduled/completed counts and rounded completion rate percent.
 */
export function completionStats(
    lastResult: PlannerResult | null,
    scheduleCompletions: Record<string, boolean>,
    year: number,
): { scheduled: number; completed: number; ratePercent: number } {
    const ROWS = lastResult?.schedule ?? [];
    const TODAY = todayKey();
    let scheduled = 0;
    let completed = 0;

    ROWS.forEach((row) => {
        const ROW_YEAR = yearFromDateKey(String(row.date || ""));
        if (ROW_YEAR !== year) {
            return;
        }
        const ROW_DATE = String(row.date || "");
        if (!ROW_DATE || Number(ROW_DATE) > Number(TODAY)) {
            return;
        }
        scheduled += 1;
        if (scheduleCompletions[sessionKeyFor(row)]) {
            completed += 1;
        }
    });

    if (!scheduled) {
        return { completed, ratePercent: 0, scheduled };
    }
    const RAW_PERCENT = (completed / scheduled) * PERCENT_MAX;
    return {
        completed,
        ratePercent: Math.round(RAW_PERCENT),
        scheduled,
    };
}

/**
 * Computes average progress percentage and started-book count.
 * @param books Book catalog.
 * @returns Aggregate progress metrics.
 */
export function averageProgress(books: Book[]): {
    startedCount: number;
    averagePercent: number;
} {
    if (!books.length) {
        return { averagePercent: 0, startedCount: 0 };
    }
    let startedCount = 0;
    let totalPercent = 0;
    books.forEach((book) => {
        const PROGRESS = Number(book.progress_percent || 0);
        if (PROGRESS > 0) {
            startedCount += 1;
        }
        totalPercent += PROGRESS;
    });
    return {
        averagePercent: Math.round((totalPercent / books.length) * 10) / 10,
        startedCount,
    };
}

/**
 * Computes monthly finish counts from planned and completed finishes.
 * @param readThisYearIds Set of books completed in target year.
 * @param books Book catalog.
 * @param plannedMonths Planned finish month index by book id.
 * @returns Array of 12 monthly finish totals.
 */
export function monthlyFinishCounts(
    readThisYearIds: Set<string>,
    books: Book[],
    plannedMonths: Map<string, number>,
): number[] {
    const COUNTS = Array.from({ length: MONTHS_PER_YEAR }, () => 0);
    plannedMonths.forEach((monthIndex) => {
        COUNTS[monthIndex] += 1;
    });
    books.forEach((book) => {
        if (!readThisYearIds.has(book.book_id)) {
            return;
        }
        const MONTH_INDEX = monthIndexFromDateKey(
            String(book.finished_at ?? ""),
        );
        if (MONTH_INDEX === null) {
            return;
        }
        COUNTS[MONTH_INDEX] += 1;
    });
    return COUNTS;
}
