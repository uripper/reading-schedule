/**
 * Formats a Date into a local calendar day key (`YYYY-MM-DD`).
 * @param date - Date value in local time.
 * @returns Day key used by schedule and completion maps.
 */
export function dayKeyFromDate(date: Date): string {
    const YEAR = date.getFullYear();
    const MONTH = String(date.getMonth() + 1).padStart(2, "0");
    const DAY = String(date.getDate()).padStart(2, "0");
    return `${YEAR}-${MONTH}-${DAY}`;
}

/**
 * Converts an ISO date/time string into a local calendar day key.
 * @param iso - ISO-8601 date string.
 * @returns Local day key, or an empty string for invalid date input.
 */
export function localDayKeyFromIso(iso: string): string {
    const DATE = new Date(iso);
    if (Number.isNaN(DATE.getTime())) {
        return "";
    }
    return dayKeyFromDate(DATE);
}
