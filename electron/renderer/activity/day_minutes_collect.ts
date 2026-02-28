const DATE_YEAR_START_INDEX = 0;
const DATE_YEAR_END_INDEX = 4;
const ZERO_MINUTES = 0;

/**
 * Extracts the numeric year from a day key string (`YYYY-MM-DD`).
 * @param dateText Day key text to parse.
 * @returns Parsed 4-digit year, or null when the key is too short/invalid.
 */
function yearFromDateKey(dateText: string): number | null {
	const key = String(dateText || "").trim();
	if (key.length < DATE_YEAR_END_INDEX) {
		return null;
	}
	const parsed = Number(key.slice(DATE_YEAR_START_INDEX, DATE_YEAR_END_INDEX));
	if (!Number.isInteger(parsed)) {
		return null;
	}
	return parsed;
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
	const dayYear = yearFromDateKey(dayKey);
	if (dayYear !== year) {
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
	const normalized = Number(minutes || ZERO_MINUTES);
	if (normalized <= ZERO_MINUTES) {
		return;
	}
	dayMinutes.set(dayKey, (dayMinutes.get(dayKey) ?? ZERO_MINUTES) + normalized);
}
