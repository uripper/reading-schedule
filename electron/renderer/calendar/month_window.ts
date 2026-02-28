const LOOKBACK_MONTH_COUNT = 12;
const LOOKBACK_MONTH_OFFSET = LOOKBACK_MONTH_COUNT - 1;
const MONTH_INDEX_OFFSET = 1;
const MONTH_KEY_PART_COUNT = 2;

/**
 * Formats month key (`YYYY-MM`) from a local Date.
 * @param date Local date.
 * @returns Month key string.
 */
function monthKeyFromDate(date: Date): string {
    const YEAR = date.getFullYear();
    const MONTH = String(date.getMonth() + MONTH_INDEX_OFFSET).padStart(2, "0");
    return `${YEAR}-${MONTH}`;
}

/**
 * Parses `YYYY-MM` key into local Date at first day of month.
 * @param monthKey Month key to parse.
 * @returns Parsed month date, or null for invalid keys.
 */
function monthDateFromKey(monthKey: string): Date | null {
    const PARTS = monthKey.split("-");
    if (PARTS.length !== MONTH_KEY_PART_COUNT) {
        return null;
    }
    const YEAR = Number(PARTS[0]);
    const MONTH = Number(PARTS[1]);
    if (!Number.isInteger(YEAR) || !Number.isInteger(MONTH)) {
        return null;
    }
    const DATE = new Date(YEAR, MONTH - MONTH_INDEX_OFFSET, 1);
    if (DATE.getFullYear() !== YEAR) {
        return null;
    }
    if (DATE.getMonth() !== MONTH - MONTH_INDEX_OFFSET) {
        return null;
    }
    return DATE;
}

/**
 * Returns earlier of two month keys.
 * @param left Left month key.
 * @param right Right month key.
 * @returns Earliest month key.
 */
function earlierMonthKey(left: string, right: string): string {
    if (left.localeCompare(right) <= 0) {
        return left;
    }
    return right;
}

/**
 * Returns later of two month keys.
 * @param left Left month key.
 * @param right Right month key.
 * @returns Latest month key.
 */
function laterMonthKey(left: string, right: string): string {
    if (left.localeCompare(right) >= 0) {
        return left;
    }
    return right;
}

/**
 * Builds contiguous inclusive month key range.
 * @param startKey Start month key.
 * @param endKey End month key.
 * @returns Inclusive month-key range.
 */
function contiguousMonthRange(startKey: string, endKey: string): string[] {
    const START_DATE = monthDateFromKey(startKey);
    const END_DATE = monthDateFromKey(endKey);
    if (START_DATE === null || END_DATE === null) {
        return [];
    }
    const OUT: string[] = [];
    const CURRENT = new Date(
        START_DATE.getFullYear(),
        START_DATE.getMonth(),
        1,
    );
    const END_TIME = END_DATE.getTime();
    while (CURRENT.getTime() <= END_TIME) {
        OUT.push(monthKeyFromDate(CURRENT));
        CURRENT.setMonth(CURRENT.getMonth() + MONTH_INDEX_OFFSET);
    }
    return OUT;
}

/**
 * Expands schedule-derived months into a navigable month window.
 * Includes a 12-month lookback from current month and full schedule span.
 * @param monthKeys Schedule-derived month keys.
 * @param now Current local date for lookback calculations.
 * @returns Contiguous month keys for calendar controls.
 */
export function buildMonthWindow(
    monthKeys: string[],
    now: Date = new Date(),
): string[] {
    if (!Array.isArray(monthKeys) || monthKeys.length === 0) {
        return [];
    }
    const SCHEDULE_MONTHS = [...new Set(monthKeys)].sort((left, right) =>
        left.localeCompare(right),
    );
    const TODAY_MONTH_KEY = monthKeyFromDate(now);
    const LOOKBACK_START_DATE = new Date(
        now.getFullYear(),
        now.getMonth() - LOOKBACK_MONTH_OFFSET,
        1,
    );
    const LOOKBACK_START_KEY = monthKeyFromDate(LOOKBACK_START_DATE);
    const SCHEDULE_START = SCHEDULE_MONTHS[0];
    const SCHEDULE_END = SCHEDULE_MONTHS[SCHEDULE_MONTHS.length - 1];
    const RANGE_START = earlierMonthKey(SCHEDULE_START, LOOKBACK_START_KEY);
    const RANGE_END = laterMonthKey(SCHEDULE_END, TODAY_MONTH_KEY);
    return contiguousMonthRange(RANGE_START, RANGE_END);
}
