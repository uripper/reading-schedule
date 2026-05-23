import type { Book, BookStatus, BookStatusFilter } from "../../types/types.ts";
import {
    BOOK_STATUS_DROPPED,
    BOOK_STATUS_FILTER_ALL,
    BOOK_STATUS_IN_PROGRESS,
    BOOK_STATUS_READ,
    BOOK_STATUS_TO_READ,
    isStatusSchedulable,
    normalizedStatus,
    statusOptions,
} from "./status_catalog.ts";

const COMPLETE_PROGRESS_PERCENT = 100;
const STARTED_PROGRESS_PERCENT = 0;
const STARTED_PAGES_READ = 0;

/**
 * Normalizes a raw status string into an internal status value.
 * Progress is used as a fallback signal when status text is absent/invalid.
 * @param value - Raw status value from persisted data or form input.
 * @param progressPercent - Current progress percentage for fallback logic.
 * @returns Normalized book status.
 */
function resolvedKnownStatus(
    knownStatus: BookStatus | null,
    progressPercent: number,
    pagesRead: number | null,
): BookStatus | null {
    if (knownStatus === null) {
        return null;
    }
    if (knownStatus === BOOK_STATUS_READ) {
        return BOOK_STATUS_READ;
    }
    if (knownStatus === BOOK_STATUS_DROPPED) {
        return BOOK_STATUS_DROPPED;
    }
    if (progressPercent >= COMPLETE_PROGRESS_PERCENT) {
        return BOOK_STATUS_READ;
    }
    if (hasStartedProgress(progressPercent, pagesRead)) {
        return BOOK_STATUS_IN_PROGRESS;
    }
    return knownStatus;
}

function normalizedPagesRead(pagesRead: number | null | undefined): number {
    const PAGES_READ = Number(pagesRead ?? 0);
    if (!Number.isFinite(PAGES_READ)) {
        return STARTED_PAGES_READ;
    }
    return PAGES_READ;
}

function hasStartedProgress(
    progressPercent: number,
    pagesRead: number | null | undefined,
): boolean {
    return (
        progressPercent > STARTED_PROGRESS_PERCENT ||
        normalizedPagesRead(pagesRead) > STARTED_PAGES_READ
    );
}

function statusFromProgress(
    progressPercent: number,
    pagesRead: number | null,
): BookStatus {
    if (progressPercent >= COMPLETE_PROGRESS_PERCENT) {
        return BOOK_STATUS_READ;
    }
    if (hasStartedProgress(progressPercent, pagesRead)) {
        return BOOK_STATUS_IN_PROGRESS;
    }
    return BOOK_STATUS_TO_READ;
}

export function statusFromRaw(
    value: string | null | undefined,
    progressPercent: number,
    pagesRead: number | null = null,
): BookStatus {
    const RAW = String(value ?? "")
        .trim()
        .toLowerCase();
    const KNOWN = normalizedStatus(RAW);
    const KNOWN_STATUS = resolvedKnownStatus(KNOWN, progressPercent, pagesRead);
    if (KNOWN_STATUS !== null) {
        return KNOWN_STATUS;
    }
    return statusFromProgress(progressPercent, pagesRead);
}

/**
 * Indicates whether a book can participate in scheduling.
 * @param book - Book-like object containing status.
 * @returns True when the status is schedulable.
 */
export function schedulableBook(book: Pick<Book, "status">): boolean {
    return isStatusSchedulable(book.status);
}

/**
 * Normalizes a raw status-filter value to a known filter option.
 * @param value - Raw filter string from UI/query params.
 * @returns Valid status filter value.
 */
export function normalizeStatusFilter(
    value: string | null | undefined,
): BookStatusFilter {
    const RAW = String(value ?? "")
        .trim()
        .toLowerCase();
    if (RAW === BOOK_STATUS_FILTER_ALL) {
        return BOOK_STATUS_FILTER_ALL;
    }
    const KNOWN = normalizedStatus(RAW);
    if (KNOWN) {
        return KNOWN;
    }
    return BOOK_STATUS_FILTER_ALL;
}

/**
 * Checks whether a book matches the active status filter.
 * @param book - Book-like object containing status.
 * @param filterValue - Active filter value.
 * @returns True when the book should be included.
 */
export function statusFilterMatches(
    book: Pick<Book, "status">,
    filterValue: BookStatusFilter,
): boolean {
    if (filterValue === BOOK_STATUS_FILTER_ALL) {
        return true;
    }
    return book.status === filterValue;
}

/**
 * Builds dropdown options for status-based filtering.
 * @returns Status-filter options including the "all" sentinel.
 */
export function statusFilterOptions(): Array<{
    value: BookStatusFilter;
    label: string;
}> {
    const OPTIONS: Array<{ value: BookStatusFilter; label: string }> = [
        { label: "All Statuses", value: BOOK_STATUS_FILTER_ALL },
    ];

    for (const OPTION of statusOptions()) {
        OPTIONS.push({
            label: OPTION.label,
            value: OPTION.value,
        });
    }
    return OPTIONS;
}
