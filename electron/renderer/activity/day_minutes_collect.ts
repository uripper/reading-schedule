const DATE_YEAR_START_INDEX = 0;
const DATE_YEAR_END_INDEX = 4;
const ZERO_MINUTES = 0;

/**
 * Extracts the numeric year from a day key string (`YYYY-MM-DD`).
 * @param dateText Day key text to parse.
 * @returns Parsed 4-digit year, or null when the key is too short/invalid.
 */
function yearFromDateKey(dateText: string): number | null {
    const KEY = String(dateText || "").trim();
    if (KEY.length < DATE_YEAR_END_INDEX) {
        return null;
    }
    const PARSED = Number(
        KEY.slice(DATE_YEAR_START_INDEX, DATE_YEAR_END_INDEX),
    );
    if (!Number.isInteger(PARSED)) {
        return null;
    }
    return PARSED;
}

/**
 * Determines whether a day key should be included for a target year filter.
 * @param dayKey Day key candidate (`YYYY-MM-DD`).
 * @param year Optional target year; when null all non-empty keys are accepted.
 * @returns True when the key should be included in aggregation.
 */
export function includeDayKey(dayKey: string, year: number | null): boolean {
    if (!dayKey) {
        return false;
    }
    if (year === null) {
        return true;
    }
    const DAY_YEAR = yearFromDateKey(dayKey);
    if (DAY_YEAR !== year) {
        return false;
    }
    return true;
}

/**
 * Adds positive minutes to a day bucket map.
 * @param dayMinutes Mutable map of day key to accumulated minutes.
 * @param dayKey Day key to update.
 * @param minutes Minute value to add; non-positive values are ignored.
 */
export function addMinutes(
    dayMinutes: Map<string, number>,
    dayKey: string,
    minutes: number,
): void {
    if (!dayKey) {
        return;
    }
    const NORMALIZED = Number(minutes || ZERO_MINUTES);
    if (NORMALIZED <= ZERO_MINUTES) {
        return;
    }
    dayMinutes.set(
        dayKey,
        (dayMinutes.get(dayKey) ?? ZERO_MINUTES) + NORMALIZED,
    );
}
