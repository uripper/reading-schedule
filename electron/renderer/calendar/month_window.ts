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
    const year = date.getFullYear();
    const month = String(date.getMonth() + MONTH_INDEX_OFFSET).padStart(2, "0");
    return `${year}-${month}`;
}

/**
 * Parses `YYYY-MM` key into local Date at first day of month.
 * @param monthKey Month key to parse.
 * @returns Parsed month date, or null for invalid keys.
 */
function monthDateFromKey(monthKey: string): Date | null {
    const parts = monthKey.split("-");
    if (parts.length !== MONTH_KEY_PART_COUNT) {
        return null;
    }
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    if (!Number.isInteger(year) || !Number.isInteger(month)) {
        return null;
    }
    const date = new Date(year, month - MONTH_INDEX_OFFSET, 1);
    if (date.getFullYear() !== year) {
        return null;
    }
    if (date.getMonth() !== month - MONTH_INDEX_OFFSET) {
        return null;
    }
    return date;
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
    const startDate = monthDateFromKey(startKey);
    const endDate = monthDateFromKey(endKey);
    if (startDate === null || endDate === null) {
        return [];
    }
    const out: string[] = [];
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endTime = endDate.getTime();
    while (current.getTime() <= endTime) {
        out.push(monthKeyFromDate(current));
        current.setMonth(current.getMonth() + MONTH_INDEX_OFFSET);
    }
    return out;
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
    const scheduleMonths = [...new Set(monthKeys)].sort((left, right) =>
        left.localeCompare(right),
    );
    const todayMonthKey = monthKeyFromDate(now);
    const lookbackStartDate = new Date(
        now.getFullYear(),
        now.getMonth() - LOOKBACK_MONTH_OFFSET,
        1,
    );
    const lookbackStartKey = monthKeyFromDate(lookbackStartDate);
    const scheduleStart = scheduleMonths[0];
    const scheduleEnd = scheduleMonths[scheduleMonths.length - 1];
    const rangeStart = earlierMonthKey(scheduleStart, lookbackStartKey);
    const rangeEnd = laterMonthKey(scheduleEnd, todayMonthKey);
    return contiguousMonthRange(rangeStart, rangeEnd);
}
