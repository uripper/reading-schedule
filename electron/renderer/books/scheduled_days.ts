import type { BookWeekday } from "../../types/books/scheduled_days.js";
export type { BookWeekday };
/**
 * @file Weekday contracts and normalization helpers for per-book scheduling.
 */

export const BOOK_WEEKDAYS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

const WEEKDAY_SET = new Set<string>(BOOK_WEEKDAYS);

/**
 * Checks whether a string matches a supported weekday key.
 * @param value Candidate weekday value.
 * @returns True when value is one of `Mon..Sun`.
 */
export function isBookWeekday(value: string): value is BookWeekday {
  return WEEKDAY_SET.has(value);
}

/**
 * Returns stable weekday order and removes duplicates/invalid values.
 * Defaults to all weekdays when no valid values are present.
 * @param rawDays Candidate weekday values.
 * @returns Ordered weekday list.
 */
function orderedWeekdays(rawDays: unknown[]): BookWeekday[] {
  const seen = new Set<BookWeekday>();
  rawDays.forEach((rawValue) => {
    if (typeof rawValue !== "string") {
      return;
    }
    const weekday = rawValue.trim();
    if (isBookWeekday(weekday)) {
      seen.add(weekday);
    }
  });
  if (seen.size === 0) {
    return [...BOOK_WEEKDAYS];
  }
  return BOOK_WEEKDAYS.filter((weekday) => seen.has(weekday));
}

/**
 * Normalizes unknown scheduled-day input to ordered weekday keys.
 * Defaults to all weekdays when input is missing or invalid.
 * @param value Raw scheduled-days input.
 * @returns Ordered weekday array with duplicates removed.
 */
export function normalizeScheduledDays(value: unknown): BookWeekday[] {
  if (Array.isArray(value)) {
    return orderedWeekdays(value);
  }
  if (typeof value === "string") {
    return orderedWeekdays(value.split(","));
  }
  return [...BOOK_WEEKDAYS];
}

/**
 * Checks whether a scheduled-day set includes all weekdays.
 * @param days Candidate scheduled-day values.
 * @returns True when `days` contains all weekdays.
 */
export function scheduledDaysMatchAll(days: readonly string[]): boolean {
  const normalized = normalizeScheduledDays(days);
  if (normalized.length !== BOOK_WEEKDAYS.length) {
    return false;
  }
  return BOOK_WEEKDAYS.every((day, index) => normalized[index] === day);
}
