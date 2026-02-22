import type { Book } from "./types.js";
import {
  BOOK_STATUS_DROPPED,
  BOOK_STATUS_FILTER_ALL,
  BOOK_STATUS_IN_PROGRESS,
  BOOK_STATUS_READ,
  BOOK_STATUS_TO_READ,
  isStatusSchedulable,
  normalizedStatus,
  statusLabel,
  statusOptions,
  type BookStatus,
  type BookStatusFilter,
} from "./status_catalog.js";

/**
 *
 * @param value
 * @param progressPercent
 */
export function statusFromRaw(
  value: string | null | undefined,
  progressPercent: number,
): BookStatus {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  const known = normalizedStatus(raw);
  if (known) {
    if (known === BOOK_STATUS_READ) {
      return BOOK_STATUS_READ;
    }
    if (known === BOOK_STATUS_DROPPED) {
      return BOOK_STATUS_DROPPED;
    }
    if (progressPercent >= 100) {
      return BOOK_STATUS_READ;
    }
    return known;
  }
  if (progressPercent >= 100) {
    return BOOK_STATUS_READ;
  }
  if (progressPercent > 0) {
    return BOOK_STATUS_IN_PROGRESS;
  }
  return BOOK_STATUS_TO_READ;
}

/**
 *
 * @param book
 */
export function schedulableBook(book: Pick<Book, "status">): boolean {
  return isStatusSchedulable(book.status);
}

/**
 *
 * @param value
 */
export function normalizeStatusFilter(
  value: string | null | undefined,
): BookStatusFilter {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (raw === BOOK_STATUS_FILTER_ALL) {
    return BOOK_STATUS_FILTER_ALL;
  }
  const known = normalizedStatus(raw);
  if (known) {
    return known;
  }
  return BOOK_STATUS_FILTER_ALL;
}

/**
 *
 * @param book
 * @param filterValue
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
 *
 */
export function statusFilterOptions(): Array<{
  value: BookStatusFilter;
  label: string;
}> {
  const options: Array<{ value: BookStatusFilter; label: string }> = [
    { value: BOOK_STATUS_FILTER_ALL, label: "All Statuses" },
  ];
  statusOptions().forEach((option) => {
    options.push(option);
  });
  return options;
}

export {
  BOOK_STATUS_DROPPED,
  BOOK_STATUS_FILTER_ALL,
  BOOK_STATUS_IN_PROGRESS,
  BOOK_STATUS_READ,
  BOOK_STATUS_TO_READ,
  isStatusSchedulable,
  statusLabel,
  statusOptions,
};

export type { BookStatus, BookStatusFilter };
