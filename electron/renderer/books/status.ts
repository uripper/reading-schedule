import type { Book } from "./types.js";

export const BOOK_STATUS_TO_READ = "to_read";
export const BOOK_STATUS_IN_PROGRESS = "in_progress";
export const BOOK_STATUS_READ = "read";
export const BOOK_STATUS_DROPPED = "dropped";

export type BookStatus =
  | typeof BOOK_STATUS_TO_READ
  | typeof BOOK_STATUS_IN_PROGRESS
  | typeof BOOK_STATUS_READ
  | typeof BOOK_STATUS_DROPPED;

const BOOK_STATUSES: BookStatus[] = [
  BOOK_STATUS_TO_READ,
  BOOK_STATUS_IN_PROGRESS,
  BOOK_STATUS_READ,
  BOOK_STATUS_DROPPED,
];

function normalizedStatus(value: string): BookStatus | null {
  const matched = BOOK_STATUSES.find((status) => {
    return status === value;
  });
  if (!matched) {
    return null;
  }
  return matched;
}

export function statusFromRaw(
  value: string | null | undefined,
  progressPercent: number,
): BookStatus {
  const raw = String(value || "").trim().toLowerCase();
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

export function isStatusSchedulable(status: BookStatus): boolean {
  if (status === BOOK_STATUS_READ) {
    return false;
  }
  if (status === BOOK_STATUS_DROPPED) {
    return false;
  }
  return true;
}

export function schedulableBook(book: Pick<Book, "status">): boolean {
  return isStatusSchedulable(book.status);
}

export function statusOptions(): Array<{ value: BookStatus; label: string }> {
  return BOOK_STATUSES.map((status) => {
    return { value: status, label: statusLabel(status) };
  });
}
