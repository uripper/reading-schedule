/**
 * Derives yearly reading metrics for the stats screen from planner results and
 * persisted book progress state.
 */
import type { Book, PlannerResult } from "../../types/types.ts";
import { finishDatesByBookId } from "../books/finish-dates.ts";
import { sessionKeyFor } from "../calendar/utils.ts";
import { todayKey } from "../sessions/utils.ts";
import { monthIndexFromDateKey, yearFromDateKey } from "./helpers.ts";

/**
 * Keeps monthly metric arrays aligned to the calendar year.
 */
const MONTHS_PER_YEAR = 12;

/**
 * Converts fractional completion rates into percentages for the stats view.
 */
const PERCENT_MAX = 100;

/**
 * Checks whether a book's planner summary still allows a projected finish date.
 */
function summaryAllowsPlannedFinish(options: {
    bookId: string;
    perBookSummary:
        | NonNullable<PlannerResult["summary"]>["per_book"]
        | undefined;
}): boolean {
    if (
        options.perBookSummary === undefined ||
        !Object.hasOwn(options.perBookSummary, options.bookId)
    ) {
        return true;
    }
    return options.perBookSummary[options.bookId].finished !== false;
}

/**
 * Returns the finish month for a planned book when it still applies to the requested year.
 */
function plannedFinishMonthIndex(options: {
    bookId: string;
    dateKey: string;
    perBookSummary:
        | NonNullable<PlannerResult["summary"]>["per_book"]
        | undefined;
    year: number;
}): number | null {
    if (yearFromDateKey(options.dateKey) !== options.year) {
        return null;
    }
    if (!summaryAllowsPlannedFinish(options)) {
        return null;
    }
    return monthIndexFromDateKey(options.dateKey);
}

/**
 * Converts a valid planned finish into a `[bookId, monthIndex]` entry.
 */
function plannedFinishEntry(options: {
    bookId: string;
    dateKey: string;
    perBookSummary:
        | NonNullable<PlannerResult["summary"]>["per_book"]
        | undefined;
    year: number;
}): [string, number] | null {
    const MONTH_INDEX = plannedFinishMonthIndex(options);
    if (MONTH_INDEX === null) {
        return null;
    }
    return [options.bookId, MONTH_INDEX];
}

/**
 * Wraps an optional planned finish entry in a list for flat-map usage.
 */
function plannedFinishEntryList(options: {
    bookId: string;
    dateKey: string;
    perBookSummary:
        | NonNullable<PlannerResult["summary"]>["per_book"]
        | undefined;
    year: number;
}): Array<[string, number]> {
    const ENTRY = plannedFinishEntry(options);
    if (ENTRY === null) {
        return [];
    }
    return [ENTRY];
}

/**
 * Collects all planned finish entries for the requested calendar year.
 */
function plannedFinishEntries(
    lastResult: PlannerResult | null,
    year: number,
): Array<[string, number]> {
    const BY_BOOK_ID = finishDatesByBookId(lastResult?.schedule ?? []);
    const PER_BOOK_SUMMARY = lastResult?.summary?.per_book ?? {};
    return Object.entries(BY_BOOK_ID).flatMap(([bookId, dateKey]) => {
        return plannedFinishEntryList({
            bookId,
            dateKey: String(dateKey),
            perBookSummary: PER_BOOK_SUMMARY,
            year,
        });
    });
}

/**
 * Builds the set and lookup map used by the stats view for planned finishes.
 */
function plannedFinishMaps(entries: Array<[string, number]>): {
    ids: Set<string>;
    monthByBookId: Map<string, number>;
} {
    const IDS = new Set<string>();
    const MONTH_BY_BOOK_ID = new Map<string, number>();
    for (const [BOOK_ID, MONTH_INDEX] of entries) {
        IDS.add(BOOK_ID);
        MONTH_BY_BOOK_ID.set(BOOK_ID, MONTH_INDEX);
    }
    return { ids: IDS, monthByBookId: MONTH_BY_BOOK_ID };
}

/**
 * Returns the books with planned finishes this year plus their finish month index.
 */
export function plannedFinishBookIds(
    lastResult: PlannerResult | null,
    year: number,
): { ids: Set<string>; monthByBookId: Map<string, number> } {
    return plannedFinishMaps(plannedFinishEntries(lastResult, year));
}

/**
 * Returns a row date only when the session belongs to the requested year and is not in the future.
 */
function rowDateIfScheduledInRange(options: {
    row: PlannerResult["schedule"][number];
    today: string;
    year: number;
}): string | null {
    const ROW_DATE = String(options.row.date || "");
    const ROW_YEAR = yearFromDateKey(ROW_DATE);
    if (ROW_YEAR !== options.year) {
        return null;
    }
    if (!ROW_DATE || ROW_DATE.localeCompare(options.today) > 0) {
        return null;
    }
    return ROW_DATE;
}

/**
 * Checks whether a scheduled row in the requested range has already been marked complete.
 */
function isCompletedScheduledRow(options: {
    row: PlannerResult["schedule"][number];
    scheduleCompletions: Record<string, boolean>;
    today: string;
    year: number;
}): boolean {
    const ROW_DATE = rowDateIfScheduledInRange({
        row: options.row,
        today: options.today,
        year: options.year,
    });
    if (ROW_DATE === null) {
        return false;
    }
    return options.scheduleCompletions[sessionKeyFor(options.row)] === true;
}

/**
 * Calculates the scheduled and completed contribution for a single schedule row.
 */
function scheduledCompletionDelta(options: {
    row: PlannerResult["schedule"][number];
    scheduleCompletions: Record<string, boolean>;
    today: string;
    year: number;
}): { completed: number; scheduled: number } {
    const ROW_DATE = rowDateIfScheduledInRange(options);
    if (ROW_DATE === null) {
        return { completed: 0, scheduled: 0 };
    }
    if (isCompletedScheduledRow(options)) {
        return { completed: 1, scheduled: 1 };
    }
    return { completed: 0, scheduled: 1 };
}

/**
 * Totals completed and scheduled sessions for the requested year through today.
 */
function countScheduledCompletions(options: {
    rows: PlannerResult["schedule"];
    scheduleCompletions: Record<string, boolean>;
    today: string;
    year: number;
}): { completed: number; scheduled: number } {
    let scheduled = 0;
    let completed = 0;
    for (const ROW of options.rows) {
        const DELTA = scheduledCompletionDelta({
            row: ROW,
            scheduleCompletions: options.scheduleCompletions,
            today: options.today,
            year: options.year,
        });
        completed += DELTA.completed;
        scheduled += DELTA.scheduled;
    }
    return { completed, scheduled };
}

/**
 * Converts completed and scheduled counts into a percentage.
 */
function completionRatePercent(completed: number, scheduled: number): number {
    if (scheduled === 0) {
        return 0;
    }
    return (completed / scheduled) * PERCENT_MAX;
}

/**
 * Summarizes scheduled-session completion totals for the stats view.
 */
export function completionStats(
    lastResult: PlannerResult | null,
    scheduleCompletions: Record<string, boolean>,
    year: number,
): { scheduled: number; completed: number; ratePercent: number } {
    const COUNTS = countScheduledCompletions({
        rows: lastResult?.schedule ?? [],
        scheduleCompletions,
        today: todayKey(),
        year,
    });
    return {
        completed: COUNTS.completed,
        ratePercent: Math.round(
            completionRatePercent(COUNTS.completed, COUNTS.scheduled),
        ),
        scheduled: COUNTS.scheduled,
    };
}

/**
 * Sums book progress and counts how many books have been started.
 */
function progressTotals(books: Book[]): {
    startedCount: number;
    totalPercent: number;
} {
    let startedCount = 0;
    let totalPercent = 0;
    for (const BOOK of books) {
        const PROGRESS = Number(BOOK.progress_percent || 0);
        if (PROGRESS > 0) {
            startedCount += 1;
        }
        totalPercent += PROGRESS;
    }
    return { startedCount, totalPercent };
}

/**
 * Computes the average completion percentage across the provided books.
 */
export function averageProgress(books: Book[]): {
    startedCount: number;
    averagePercent: number;
} {
    if (books.length === 0) {
        return { averagePercent: 0, startedCount: 0 };
    }
    const TOTALS = progressTotals(books);
    return {
        averagePercent:
            Math.round((TOTALS.totalPercent / books.length) * 10) / 10,
        startedCount: TOTALS.startedCount,
    };
}

/**
 * Reads the finished month index from a book record.
 */
function monthIndexFromFinishedBook(book: Book): number | null {
    return monthIndexFromDateKey(String(book.finished_at ?? ""));
}

/**
 * Returns a finished month only for books counted as read this year.
 */
function completedReadMonth(
    book: Book,
    readThisYearIds: Set<string>,
): number | null {
    if (!readThisYearIds.has(book.book_id)) {
        return null;
    }
    return monthIndexFromFinishedBook(book);
}

/**
 * Collects the finished month indexes for books completed this year.
 */
function completedReadMonths(
    books: Book[],
    readThisYearIds: Set<string>,
): number[] {
    const MONTHS: number[] = [];
    for (const BOOK of books) {
        const MONTH_INDEX = completedReadMonth(BOOK, readThisYearIds);
        if (MONTH_INDEX !== null) {
            MONTHS.push(MONTH_INDEX);
        }
    }
    return MONTHS;
}

/**
 * Adds one count for each supplied month index without mutating the input array.
 */
function incrementMonthlyCounts(
    counts: number[],
    monthIndexes: Iterable<number>,
): number[] {
    const NEXT_COUNTS = [...counts];
    for (const MONTH_INDEX of monthIndexes) {
        NEXT_COUNTS[MONTH_INDEX] += 1;
    }
    return NEXT_COUNTS;
}

/**
 * Builds per-month finish counts from planned and completed books.
 */
export function monthlyFinishCounts(
    readThisYearIds: Set<string>,
    books: Book[],
    plannedMonths: Map<string, number>,
): number[] {
    const COUNTS = Array.from({ length: MONTHS_PER_YEAR }, () => 0);
    const PLANNED_COUNTS = incrementMonthlyCounts(
        COUNTS,
        plannedMonths.values(),
    );
    return incrementMonthlyCounts(
        PLANNED_COUNTS,
        completedReadMonths(books, readThisYearIds),
    );
}
