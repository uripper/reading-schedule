import type { SortableRow } from "../../types/types.ts";
import {
    CALENDAR_COLUMN_COUNT,
    SESSION_INDEX_PAD,
    WEEK_START_OFFSET,
} from "./constants.ts";

const DATE_KEY_PART_COUNT = 3;
const DATE_KEY_MONTH_INDEX = 1;
const DATE_KEY_DAY_INDEX = 2;
const MONTH_INDEX_OFFSET = 1;

function parsedDateKeyParts(dateKey: string): {
    day: number;
    month: number;
    year: number;
} | null {
    const PARTS = dateKey.split("-");
    if (PARTS.length !== DATE_KEY_PART_COUNT) {
        return null;
    }
    const YEAR = Number(PARTS[0]);
    const MONTH = Number(PARTS[DATE_KEY_MONTH_INDEX]);
    const DAY = Number(PARTS[DATE_KEY_DAY_INDEX]);
    if (!Number.isInteger(YEAR)) {
        return null;
    }
    if (!Number.isInteger(MONTH)) {
        return null;
    }
    if (!Number.isInteger(DAY)) {
        return null;
    }
    return { day: DAY, month: MONTH, year: YEAR };
}

function matchesDateParts(
    date: Date,
    parts: { day: number; month: number; year: number },
): boolean {
    if (date.getFullYear() !== parts.year) {
        return false;
    }
    if (date.getMonth() !== parts.month - MONTH_INDEX_OFFSET) {
        return false;
    }
    return date.getDate() === parts.day;
}

/**
 * Calculates the number of weeks needed to display a month in a calendar grid.
 * @param weekdayOffset - Number of blank cells before the first day of the month (0-6).
 * @param daysInMonth - Number of days in the month (28-31).
 * @returns Number of weeks needed to display the month.
 */
function weekCountNeeded(weekdayOffset: number, daysInMonth: number): number {
    const TOTAL_CELLS = weekdayOffset + daysInMonth;
    return Math.ceil(TOTAL_CELLS / CALENDAR_COLUMN_COUNT);
}

/**
 * Builds sortable key from calendar row date and session index.
 * @param row - Row containing date and session index fields.
 * @returns Lexicographically sortable row key.
 */
function rowSortKey(row: SortableRow): string {
    const SESSION_INDEX = String(row.session_index).padStart(
        SESSION_INDEX_PAD,
        "0",
    );
    return `${row.date}-${SESSION_INDEX}`;
}

/**
 * Returns a sorted copy of rows by date then session index.
 * @param rows - Rows to sort.
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
 * @param key - Month key.
 * @returns Human-readable month/year label.
 */
export function monthLabel(key: string): string {
    if (!key) {
        return "No Schedule";
    }
    const [YEAR, MONTH] = key.split("-").map(Number);
    const FORMATTER = new Intl.DateTimeFormat(undefined, {
        month: "long",
        year: "numeric",
    });
    return FORMATTER.format(new Date(YEAR, MONTH - 1, 1));
}

/**
 * Converts Date object to local `YYYY-MM-DD` key.
 * @param date - Date to serialize.
 * @returns Day key string.
 */
export function dayKey(date: Date): string {
    const YEAR = date.getFullYear();
    const MONTH = String(date.getMonth() + 1).padStart(2, "0");
    const DAY_OF_MONTH = String(date.getDate()).padStart(2, "0");
    return `${YEAR}-${MONTH}-${DAY_OF_MONTH}`;
}

/**
 * Returns the 6-week calendar grid date cells for a month key.
 * @param monthKey - Month key in `YYYY-MM` format.
 * @returns Date cells used for calendar month rendering.
 */
export function monthCells(monthKey: string): Date[] {
    const [YEAR, MONTH] = monthKey.split("-").map(Number);
    const FIRST = new Date(YEAR, MONTH - MONTH_INDEX_OFFSET, 1);
    const START = new Date(FIRST);
    const WEEKDAY_OFFSET =
        (FIRST.getDay() + WEEK_START_OFFSET) % CALENDAR_COLUMN_COUNT;
    START.setDate(FIRST.getDate() - WEEKDAY_OFFSET);

    // Determine day_grid_size based on number of days in month
    const DAYS_IN_MONTH = new Date(YEAR, MONTH, 0).getDate();
    const WEEK_COUNT = weekCountNeeded(WEEKDAY_OFFSET, DAYS_IN_MONTH);
    const DAY_GRID_SIZE: number = CALENDAR_COLUMN_COUNT * WEEK_COUNT;

    return Array.from({ length: DAY_GRID_SIZE }, (_, index) => {
        return new Date(
            START.getFullYear(),
            START.getMonth(),
            START.getDate() + index,
        );
    });
}

/**
 * Parses a day key (`YYYY-MM-DD`) into a local Date.
 * @param dateKey - Day key to parse.
 * @returns Local Date for valid keys, otherwise null.
 */
function parseDayKey(dateKey: string): Date | null {
    const PARTS = parsedDateKeyParts(dateKey);
    if (PARTS === null) {
        return null;
    }
    const DATE = new Date(
        PARTS.year,
        PARTS.month - MONTH_INDEX_OFFSET,
        PARTS.day,
    );
    if (!matchesDateParts(DATE, PARTS)) {
        return null;
    }
    return DATE;
}

/**
 * Formats date key for calendar details heading.
 * @param dateKey - Day key in `YYYY-MM-DD` format.
 * @returns Human-readable heading string.
 */
export function dateHeading(dateKey: string): string {
    const DATE = parseDayKey(dateKey);
    if (DATE === null) {
        return dateKey;
    }
    const FORMATTER = new Intl.DateTimeFormat(undefined, {
        day: "numeric",
        month: "long",
        weekday: "long",
        year: "numeric",
    });
    return FORMATTER.format(DATE);
}

/**
 * Builds stable session key from row date, index, and book id.
 * @param row - Row identity fields.
 * @param row.date - Session date key.
 * @param row.session_index - Session index within date.
 * @param row.book_id - Book id for session.
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
 * @param value - Numeric-like value from UI or payload.
 * @returns Parsed number or `null`.
 */
export function parseOptionalNumber(value?: string | number): number | null {
    const RAW = String(value ?? "").trim();
    if (!RAW) {
        return null;
    }
    const PARSED = Number(RAW);
    if (!Number.isFinite(PARSED)) {
        return null;
    }
    return PARSED;
}
