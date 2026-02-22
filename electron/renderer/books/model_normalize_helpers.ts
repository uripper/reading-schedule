import { dayKey } from "../calendar/utils.js";
import { uid } from "../dom.js";
import { BOOK_STATUS_READ } from "./status.js";
import { clamp, toInt } from "./utils.js";

const DEFAULT_MIN_BLOCKS = 1;
const PROGRESS_MAX = 100;
const PROGRESS_SCALE = 10;

export const DEFAULT_PRIORITY = 3;
export const DEFAULT_DIFFICULTY = 3;
export const MIN_PRIORITY = 1;
export const MAX_PRIORITY = 5;
export const MIN_DIFFICULTY = 1;
export const MAX_DIFFICULTY = 10;

/**
 *
 * @param value
 * @param fallback
 */
function toIntWithFallback(value: number | undefined, fallback: number): number {
  return toInt(value ?? fallback, fallback);
}

/**
 *
 * @param value
 */
function normalizeFinishedAt(value: string | null | undefined): string | null {
  return withNullableString(toTrimmedText(value));
}

/**
 *
 */
function todayDateKey(): string {
  return dayKey(new Date());
}

/**
 *
 * @param value
 */
export function toTrimmedText(value?: string | null): string {
  return String(value ?? "").trim();
}

/**
 *
 * @param value
 */
export function toBookId(value?: string): string {
  const text = toTrimmedText(value);
  if (text) {
    return text;
  }
  return uid();
}

/**
 *
 * @param value
 * @param fallback
 * @param minValue
 * @param maxValue
 */
export function toClampedInt(
  value: number | undefined,
  fallback: number,
  minValue: number,
  maxValue: number,
): number {
  return clamp(toIntWithFallback(value, fallback), minValue, maxValue);
}

/**
 *
 * @param value
 */
export function minBlocksPerSession(value: number | undefined): number {
  return Math.max(DEFAULT_MIN_BLOCKS, toIntWithFallback(value, DEFAULT_MIN_BLOCKS));
}

/**
 *
 * @param value
 */
export function withNullableString(value: string | null | undefined): string | null {
  if (value) {
    return value;
  }
  return null;
}

/**
 *
 * @param status
 * @param finishedAtRaw
 */
export function finishedAtForStatus(
  status: string,
  finishedAtRaw: string | null | undefined,
): string | null {
  const finishedAt = normalizeFinishedAt(finishedAtRaw);
  if (status !== BOOK_STATUS_READ) {
    return null;
  }
  if (finishedAt) {
    return finishedAt;
  }
  return todayDateKey();
}

/**
 *
 * @param pagesTotal
 * @param pagesRead
 * @param progressRaw
 */
export function normalizeProgressAndPages(
  pagesTotal: number | null,
  pagesRead: number | null,
  progressRaw: number,
): { pagesRead: number | null; progress: number } {
  let nextPagesRead = pagesRead;
  if (pagesTotal && nextPagesRead === null) {
    nextPagesRead = Math.round((progressRaw / PROGRESS_MAX) * pagesTotal);
  }
  if (pagesTotal && nextPagesRead !== null) {
    nextPagesRead = clamp(nextPagesRead, 0, pagesTotal);
  }
  let progress = Math.round(progressRaw * PROGRESS_SCALE) / PROGRESS_SCALE;
  if (pagesTotal) {
    progress =
      Math.round(
        ((nextPagesRead || 0) / pagesTotal) * PROGRESS_MAX * PROGRESS_SCALE,
      ) / PROGRESS_SCALE;
  }
  return { pagesRead: nextPagesRead, progress };
}
