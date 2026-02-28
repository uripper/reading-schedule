import type { SortableRow } from "../../types/types.js";
import {
    CALENDAR_COLUMN_COUNT,
    SESSION_INDEX_PAD,
    WEEK_START_OFFSET,
} from "./constants.js";

const DATE_KEY_PART_COUNT = 3;
const DATE_KEY_MONTH_INDEX = 1;
const DATE_KEY_DAY_INDEX = 2;
const MONTH_INDEX_OFFSET = 1;

/**
 * Calculates the number of weeks needed to display a month in a calendar grid.
 * @param weekdayOffset Number of blank cells before the first day of the month (0-6).
 * @param daysInMonth Number of days in the month (28-31).
 * @returns Number of weeks needed to display the month.
 */
function weekCountNeeded(weekdayOffset: number, daysInMonth: number): number {
    const totalCells = weekdayOffset + daysInMonth;
    return Math.ceil(totalCells / CALENDAR_COLUMN_COUNT);
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
    const first = new Date(year, month - MONTH_INDEX_OFFSET, 1);
    const start = new Date(first);
    const weekdayOffset =
        (first.getDay() + WEEK_START_OFFSET) % CALENDAR_COLUMN_COUNT;
    start.setDate(first.getDate() - weekdayOffset);

    // Determine day_grid_size based on number of days in month
    const daysInMonth = new Date(year, month, 0).getDate();
    const weekCount = weekCountNeeded(weekdayOffset, daysInMonth);
    const dayGridSize: number = CALENDAR_COLUMN_COUNT * weekCount;

    return Array.from({ length: dayGridSize }, (_, index) => {
        return new Date(
            start.getFullYear(),
            start.getMonth(),
            start.getDate() + index,
        );
    });
}

/**
 * Parses a day key (`YYYY-MM-DD`) into a local Date.
 * @param dateKey Day key to parse.
 * @returns Local Date for valid keys, otherwise null.
 */
function parseDayKey(dateKey: string): Date | null {
    const parts = dateKey.split("-");
    if (parts.length !== DATE_KEY_PART_COUNT) {
        return null;
    }
    const year = Number(parts[0]);
    const month = Number(parts[DATE_KEY_MONTH_INDEX]);
    const day = Number(parts[DATE_KEY_DAY_INDEX]);
    if (!Number.isInteger(year)) {
        return null;
    }
    if (!Number.isInteger(month)) {
        return null;
    }
    if (!Number.isInteger(day)) {
        return null;
    }
    const date = new Date(year, month - MONTH_INDEX_OFFSET, day);
    if (date.getFullYear() !== year) {
        return null;
    }
    if (date.getMonth() !== month - MONTH_INDEX_OFFSET) {
        return null;
    }
    if (date.getDate() !== day) {
        return null;
    }
    return date;
}

/**
 * Formats date key for calendar details heading.
 * @param dateKey Day key in `YYYY-MM-DD` format.
 * @returns Human-readable heading string.
 */
export function dateHeading(dateKey: string): string {
    const date = parseDayKey(dateKey);
    if (date === null) {
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
