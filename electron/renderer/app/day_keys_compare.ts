const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const MONTH_INDEX_OFFSET = 1;
const DAY_KEY_COMPARE_EQUAL = 0;
const DAY_KEY_COMPARE_LEFT_BEFORE_RIGHT = -1;
const DAY_KEY_COMPARE_LEFT_AFTER_RIGHT = 1;

/**
 * Validates strict local day-key format (`YYYY-MM-DD`) and calendar date ranges.
 * @param dayKey Candidate day key.
 * @returns True when the key is a valid calendar day.
 */
export function isValidDayKey(dayKey: string): boolean {
    if (!DAY_KEY_PATTERN.test(dayKey)) {
        return false;
    }
    const [year, month, day] = dayKey.split("-").map(Number);
    if (!Number.isInteger(year)) {
        return false;
    }
    if (!Number.isInteger(month)) {
        return false;
    }
    if (!Number.isInteger(day)) {
        return false;
    }
    const parsed = new Date(year, month - MONTH_INDEX_OFFSET, day);
    if (parsed.getFullYear() !== year) {
        return false;
    }
    if (parsed.getMonth() !== month - MONTH_INDEX_OFFSET) {
        return false;
    }
    if (parsed.getDate() !== day) {
        return false;
    }
    return true;
}

/**
 * Compares two valid day keys using ISO lexical ordering.
 * @param left Left day key.
 * @param right Right day key.
 * @returns `-1` when left is earlier, `0` when equal, `1` when later, else `null`.
 */
export function compareDayKeys(left: string, right: string): number | null {
    if (!isValidDayKey(left)) {
        return null;
    }
    if (!isValidDayKey(right)) {
        return null;
    }
    if (left === right) {
        return DAY_KEY_COMPARE_EQUAL;
    }
    if (left < right) {
        return DAY_KEY_COMPARE_LEFT_BEFORE_RIGHT;
    }
    return DAY_KEY_COMPARE_LEFT_AFTER_RIGHT;
}

/**
 * Checks whether a valid day key is on or before another valid day key.
 * @param left Left day key.
 * @param right Right day key.
 * @returns True when `left` is on or before `right`.
 */
export function isOnOrBeforeDay(left: string, right: string): boolean {
    const compared = compareDayKeys(left, right);
    if (compared === null) {
        return false;
    }
    return compared <= DAY_KEY_COMPARE_EQUAL;
}

/**
 * Checks whether a valid day key is on or after another valid day key.
 * @param left Left day key.
 * @param right Right day key.
 * @returns True when `left` is on or after `right`.
 */
export function isOnOrAfterDay(left: string, right: string): boolean {
    const compared = compareDayKeys(left, right);
    if (compared === null) {
        return false;
    }
    return compared >= DAY_KEY_COMPARE_EQUAL;
}
