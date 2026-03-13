import { yearFromDateKey } from "@renderer/stats/helpers";

/**
 * Determines whether a day key should be included for a target year filter.
 * @param dayKey - Day key candidate (`YYYY-MM-DD`).
 * @param year - Optional target year; when null all non-empty keys are accepted.
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
 * @param dayMinutes - Mutable map of day key to accumulated minutes.
 * @param dayKey - Day key to update.
 * @param minutes - Minute value to add; non-positive values are ignored.
 */
export function addMinutes(
  dayMinutes: Map<string, number>,
  dayKey: string,
  minutes: number,
): void {
  if (!dayKey) {
    return;
  }
  const NORMALIZED = Number(minutes || 0);
  if (NORMALIZED <= 0) {
    return;
  }
  dayMinutes.set(dayKey, (dayMinutes.get(dayKey) ?? 0) + NORMALIZED);
}
