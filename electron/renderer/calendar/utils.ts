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
 * Builds sortable key from calendar row date and session index.
 * @param row Row containing date and session index fields.
 * @returns Lexicographically sortable row key.
 */
function rowSortKey(row: SortableRow): string {
  const sessionIndex = String(row.session_index).padStart(
    SESSION_INDEX_PAD,
    "0",
  );
  return `${row.date}-${sessionIndex}`;
}

/**
 * Returns a sorted copy of rows by date then session index.
 * @param rows Rows to sort.
 * @returns Sorted row copy.
 */
export function sortRowsByDateAndSession<T extends SortableRow>(
  rows: T[] = [],
): T[] {
  return [...rows].sort((left, right) =>
    rowSortKey(left).localeCompare(rowSortKey(right)),
  );
}

/**
 * Formats `YYYY-MM` month keys for calendar header display.
 * @param key Month key.
 * @returns Human-readable month/year label.
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
 * Converts Date object to local `YYYY-MM-DD` key.
 * @param date Date to serialize.
 * @returns Day key string.
 */
export function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayOfMonth}`;
}

/**
 * Returns the 6-week calendar grid date cells for a month key.
 * @param monthKey Month key in `YYYY-MM` format.
 * @returns Date cells used for calendar month rendering.
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
 * Formats date key for calendar details heading.
 * @param dateKey Day key in `YYYY-MM-DD` format.
 * @returns Human-readable heading string.
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
 * Builds stable session key from row date, index, and book id.
 * @param row Row identity fields.
 * @param row.date Session date key.
 * @param row.session_index Session index within date.
 * @param row.book_id Book id for session.
 * @returns Session identity key.
 */
export function sessionKeyFor(row: {
  date: string;
  session_index: string | number;
  book_id: string | number;
}): string {
  return `${row.date}|${row.session_index}|${row.book_id}`;
}

/**
 * Parses optional numeric input and returns null for blank/invalid values.
 * @param value Numeric-like value from UI or payload.
 * @returns Parsed number or `null`.
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
