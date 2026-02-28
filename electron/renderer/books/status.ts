import type {
  Book,
  BookStatus,
  BookStatusFilter,
} from "../../types/types.js";
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
} from "./status_catalog.js";

/**
 * Normalizes a raw status string into an internal status value.
 * Progress is used as a fallback signal when status text is absent/invalid.
 * @param value Raw status value from persisted data or form input.
 * @param progressPercent Current progress percentage for fallback logic.
 * @returns Normalized book status.
 */
export function statusFromRaw(
  value: string | null | undefined,
  progressPercent: number,
): BookStatus {
  const raw = String(value ?? "")
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
 * Indicates whether a book can participate in scheduling.
 * @param book Book-like object containing status.
 * @returns True when the status is schedulable.
 */
export function schedulableBook(book: Pick<Book, "status">): boolean {
  return isStatusSchedulable(book.status);
}

/**
 * Normalizes a raw status-filter value to a known filter option.
 * @param value Raw filter string from UI/query params.
 * @returns Valid status filter value.
 */
export function normalizeStatusFilter(
  value: string | null | undefined,
): BookStatusFilter {
  const raw = String(value ?? "")
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
 * Checks whether a book matches the active status filter.
 * @param book Book-like object containing status.
 * @param filterValue Active filter value.
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
  normalizedStatus,
  statusLabel,
  statusOptions,
};
