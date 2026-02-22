import {
  CALENDAR_COLUMN_COUNT,
  DAY_GRID_SIZE,
  SESSION_INDEX_PAD,
  WEEK_START_OFFSET,
} from "./constants.js";

interface SortableRow {
  date: string;
  session_index: string | number;
}

/**
 *
 * @param row
 */
function rowSortKey(row: SortableRow): string {
  const sessionIndex = String(row.session_index).padStart(
    SESSION_INDEX_PAD,
    "0",
  );
  return `${row.date}-${sessionIndex}`;
}

/**
 *
 * @param rows
 */
export function sortRowsByDateAndSession<T extends SortableRow>(
  rows: T[] = [],
): T[] {
  return [...rows].sort((left, right) =>
    rowSortKey(left).localeCompare(rowSortKey(right)),
  );
}

/**
 *
 * @param key
 */
export function monthLabel(key: string): string {
  if (!key) {
    return "No Schedule";
  }
  const [year, month] = key.split("-").map(Number);
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  });
  return formatter.format(new Date(year, month - 1, 1));
}

/**
 *
 * @param date
 */
export function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayOfMonth}`;
}

/**
 *
 * @param monthKey
 */
export function monthCells(monthKey: string): Date[] {
  const [year, month] = monthKey.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const start = new Date(first);
  const weekdayOffset =
    (first.getDay() + WEEK_START_OFFSET) % CALENDAR_COLUMN_COUNT;
  start.setDate(first.getDate() - weekdayOffset);
  return Array.from({ length: DAY_GRID_SIZE }, (_, index) => {
    return new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + index,
    );
  });
}

/**
 *
 * @param dateKey
 */
export function dateHeading(dateKey: string): string {
  const date = new Date(dateKey);
  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }
  const formatter = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return formatter.format(date);
}

/**
 *
 * @param row
 * @param row.date
 * @param row.session_index
 * @param row.book_id
 */
export function sessionKeyFor(row: {
  date: string;
  session_index: string | number;
  book_id: string | number;
}): string {
  return `${row.date}|${row.session_index}|${row.book_id}`;
}

/**
 *
 * @param value
 */
export function parseOptionalNumber(value?: string | number): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}
