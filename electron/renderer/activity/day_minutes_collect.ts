const DATE_YEAR_START_INDEX = 0;
const DATE_YEAR_END_INDEX = 4;
const ZERO_MINUTES = 0;

/**
 *
 * @param dateText
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
 *
 * @param dayKey
 * @param year
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
 *
 * @param dayMinutes
 * @param dayKey
 * @param minutes
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
