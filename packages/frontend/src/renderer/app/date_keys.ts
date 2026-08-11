const NEXT_DAY_OFFSET = 1;

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
 * Returns today's local calendar day key.
 * @returns Day key for the current local date.
 */
export function todayDayKey(): string {
    return dayKeyFromDate(new Date());
}

/**
 * Returns the local calendar day immediately after a valid day key.
 * @param dayKey - Base day in `YYYY-MM-DD` format.
 * @returns Following local day key.
 */
export function nextDayKey(dayKey: string): string {
    const DATE = new Date(`${dayKey}T00:00:00`);
    if (Number.isNaN(DATE.getTime())) {
        throw new Error(`Cannot advance invalid day key: ${dayKey}`);
    }
    DATE.setDate(DATE.getDate() + NEXT_DAY_OFFSET);
    return dayKeyFromDate(DATE);
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
