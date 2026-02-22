export const BOOK_STATUS_TO_READ = "to_read";
export const BOOK_STATUS_IN_PROGRESS = "in_progress";
export const BOOK_STATUS_READ = "read";
export const BOOK_STATUS_DROPPED = "dropped";
export const BOOK_STATUS_FILTER_ALL = "all";

export type BookStatus =
  | typeof BOOK_STATUS_TO_READ
  | typeof BOOK_STATUS_IN_PROGRESS
  | typeof BOOK_STATUS_READ
  | typeof BOOK_STATUS_DROPPED;

export type BookStatusFilter = typeof BOOK_STATUS_FILTER_ALL | BookStatus;

const BOOK_STATUSES: BookStatus[] = [
  BOOK_STATUS_TO_READ,
  BOOK_STATUS_IN_PROGRESS,
  BOOK_STATUS_READ,
  BOOK_STATUS_DROPPED,
];

export function normalizedStatus(value: string): BookStatus | null {
  const matched = BOOK_STATUSES.find((status) => {
    return status === value;
  });
  if (!matched) {
    return null;
  }
  return matched;
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

export function statusOptions(): Array<{ value: BookStatus; label: string }> {
  return BOOK_STATUSES.map((status) => {
    return { value: status, label: statusLabel(status) };
  });
}
