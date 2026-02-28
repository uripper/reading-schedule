const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CALENDAR_DATE_SUFFIX = "T00:00:00";
const MONTH_BASE = 1;
const DAY_PAD = 2;

/**
 * Formats a Date into a local `YYYY-MM-DD` key.
 * @param date Date value to format.
 * @returns Local day key.
 */
function dayKeyFromDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + MONTH_BASE).padStart(DAY_PAD, "0");
    const day = String(date.getDate()).padStart(DAY_PAD, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Checks whether text is a valid `YYYY-MM-DD` day key.
 * @param dateKey Candidate day key.
 * @returns `true` when key shape and calendar date are valid.
 */
export function isValidDateKey(dateKey: string): boolean {
    if (!DATE_KEY_PATTERN.test(dateKey)) {
        return false;
    }
    const parsed = new Date(`${dateKey}${CALENDAR_DATE_SUFFIX}`);
    if (Number.isNaN(parsed.getTime())) {
        return false;
    }
    return dayKeyFromDate(parsed) === dateKey;
}

/**
 * Navigates to an estimated-finish day when the provided key is valid.
 * @param dateKey Estimated finish day key.
 * @param onNavigate Callback invoked with validated day key.
 * @returns `true` when navigation callback was invoked.
 */
export function navigateToEstimatedFinishDate(
    dateKey: string,
    onNavigate: (dateKey: string) => void,
): boolean {
    if (!isValidDateKey(dateKey)) {
        return false;
    }
    onNavigate(dateKey);
    return true;
}
