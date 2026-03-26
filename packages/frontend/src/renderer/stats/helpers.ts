import type { Book, StatusBreakdown } from "../../types/types.ts";
import {
    BOOK_STATUS_DROPPED,
    BOOK_STATUS_IN_PROGRESS,
    BOOK_STATUS_READ,
    BOOK_STATUS_TO_READ,
} from "../books/status_catalog.ts";

const MONTHS_PER_YEAR = 12;
const DATE_YEAR_START_INDEX = 0;
const DATE_YEAR_END_INDEX = 4;
const DATE_MONTH_START_INDEX = 5;
const DATE_MONTH_END_INDEX = 7;
const MIN_MONTH_NUMBER = 1;
const MONTH_NUMBER_TO_INDEX_OFFSET = 1;

/**
 * Parses year component from a `YYYY-MM-DD` date key.
 * @param dateText - Date key text.
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
 * @param dateText - Date key text.
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

function finishedReadBookIdForYear(book: Book, year: number): string | null {
    if (book.status !== BOOK_STATUS_READ) {
        return null;
    }
    const FINISHED_YEAR = yearFromDateKey(String(book.finished_at ?? ""));
    if (FINISHED_YEAR !== year) {
        return null;
    }
    return book.book_id;
}

/**
 * Counts books by status for dashboard status distribution.
 * @param books - Book catalog.
 * @returns Status-to-count breakdown.
 */
export function statusBreakdown(books: Book[]): StatusBreakdown {
    const COUNTS: StatusBreakdown = {
        [BOOK_STATUS_TO_READ]: 0,
        [BOOK_STATUS_IN_PROGRESS]: 0,
        [BOOK_STATUS_READ]: 0,
        [BOOK_STATUS_DROPPED]: 0,
    };
    for (const BOOK of books) {
        COUNTS[BOOK.status] += 1;
    }
    return COUNTS;
}

/**
 * Collects ids of books marked read and finished in the target year.
 * @param books - Book catalog.
 * @param year - Target year.
 * @returns Set of read book ids finished that year.
 */
export function readBooksFinishedThisYear(
    books: Book[],
    year: number,
): Set<string> {
    const IDS = new Set<string>();
    for (const BOOK of books) {
        const BOOK_ID = finishedReadBookIdForYear(BOOK, year);
        if (BOOK_ID !== null) {
            IDS.add(BOOK_ID);
        }
    }
    return IDS;
}
