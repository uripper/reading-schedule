import type { BookStatus } from "../../types/types.js";
export const BOOK_STATUS_TO_READ = "to_read";
export const BOOK_STATUS_IN_PROGRESS = "in_progress";
export const BOOK_STATUS_READ = "read";
export const BOOK_STATUS_DROPPED = "dropped";
export const BOOK_STATUS_FILTER_ALL = "all";

const BOOK_STATUSES: BookStatus[] = [
    BOOK_STATUS_TO_READ,
    BOOK_STATUS_IN_PROGRESS,
    BOOK_STATUS_READ,
    BOOK_STATUS_DROPPED,
];

/**
 * Normalizes raw status text to a supported status value.
 * @param value - Raw status text.
 * @returns Matching status or `null` when unsupported.
 */
export function normalizedStatus(value: string): BookStatus | null {
    const MATCHED = BOOK_STATUSES.find((status) => {
        return status === value;
    });
    if (!MATCHED) {
        return null;
    }
    return MATCHED;
}

/**
 * Returns human-readable label for a book status.
 * @param status - Supported status value.
 * @returns Display label used in UI.
 */
export function statusLabel(status: BookStatus): string {
    if (status === BOOK_STATUS_READ) {
        return "Read";
    }
    if (status === BOOK_STATUS_DROPPED) {
        return "Dropped";
    }
    if (status === BOOK_STATUS_IN_PROGRESS) {
        return "In Progress";
    }
    return "To Read";
}

/**
 * Indicates whether status should be considered by scheduling logic.
 * @param status - Supported status value.
 * @returns `true` when status is schedulable.
 */
export function isStatusSchedulable(status: BookStatus): boolean {
    if (status === BOOK_STATUS_READ) {
        return false;
    }
    if (status === BOOK_STATUS_DROPPED) {
        return false;
    }
    return true;
}

/**
 * Returns selectable status options for form controls.
 * @returns Status options with value/label pairs.
 */
export function statusOptions(): Array<{ value: BookStatus; label: string }> {
    return BOOK_STATUSES.map((status) => {
        return { label: statusLabel(status), value: status };
    });
}
