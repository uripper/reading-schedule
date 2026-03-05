import { dayKey } from "../calendar/utils.js";
import { uid } from "../dom.js";
import { BOOK_STATUS_READ } from "./status_catalog.js";
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
 * Converts a numeric input to integer, defaulting when undefined/invalid.
 * @param value - Raw numeric value from a book field.
 * @param fallback - Default integer when value is missing.
 * @returns Parsed integer constrained by `toInt` fallback behavior.
 */
function toIntWithFallback(
    value: number | undefined,
    fallback: number,
): number {
    return toInt(value ?? fallback, fallback);
}

/**
 * Normalizes optional finished date text into nullable trimmed form.
 * @param value - Raw finished date text.
 * @returns Trimmed date string or `null` when empty.
 */
function normalizeFinishedAt(value: string | null | undefined): string | null {
    const TRIMMED = String(value ?? "").trim();
    if (TRIMMED === "") {
        return null;
    }
    return TRIMMED;
}

/**
 * Produces today's day key for read-status fallback finish dates.
 * @returns Day key in `YYYY-MM-DD` format.
 */
function todayDateKey(): string {
    return dayKey(new Date());
}

/**
 * Trims optional text values and normalizes nullish input to empty string.
 * @param value - Optional text value.
 * @returns Trimmed text.
 */
export function toTrimmedText(value?: string | null): string {
    return String(value ?? "").trim();
}

/**
 * Returns a stable book id, generating one when input is blank.
 * @param value - Existing book id candidate.
 * @returns Existing trimmed id or generated uid.
 */
export function toBookId(value?: string): string {
    const TEXT = toTrimmedText(value);
    if (TEXT) {
        return TEXT;
    }
    return uid();
}

/**
 * Parses integer input and clamps it to an allowed range.
 * @param value - Raw numeric value from book data.
 * @param fallback - Integer used when value is missing/invalid.
 * @param minValue - Inclusive minimum.
 * @param maxValue - Inclusive maximum.
 * @returns Clamped integer value.
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
 * Ensures minimum blocks per session is at least one.
 * @param value - Raw configured minimum blocks.
 * @returns Valid minimum blocks value.
 */
export function minBlocksPerSession(value: number | undefined): number {
    return Math.max(
        DEFAULT_MIN_BLOCKS,
        toIntWithFallback(value, DEFAULT_MIN_BLOCKS),
    );
}

/**
 * Converts optional strings to nullable values used by persistence payloads.
 * @param value - Optional string value.
 * @returns String when truthy; otherwise `null`.
 */
export function withNullableString(
    value: string | null | undefined,
): string | null {
    if (value !== null && value !== undefined && value !== "") {
        return value;
    }
    return null;
}

/**
 * Resolves `finished_at` value based on current status semantics.
 * @param status - Normalized book status value.
 * @param finishedAtRaw - Raw finished date text from source model.
 * @returns `null` for non-read status, explicit date when provided, or today for read books.
 */
export function finishedAtForStatus(
    status: string,
    finishedAtRaw: string | null | undefined,
): string | null {
    const FINISHED_AT = normalizeFinishedAt(finishedAtRaw);
    if (status !== BOOK_STATUS_READ) {
        return null;
    }
    if (FINISHED_AT !== null) {
        return FINISHED_AT;
    }
    return todayDateKey();
}

/**
 * Normalizes pages read and progress so both fields stay consistent.
 * @param pagesTotal - Total pages when known.
 * @param pagesRead - Pages read when provided.
 * @param progressRaw - Raw progress percent value.
 * @returns Normalized pages read and progress percent pair.
 */
export function normalizeProgressAndPages(
    pagesTotal: number | null,
    pagesRead: number | null,
    progressRaw: number,
): { pagesRead: number | null; progress: number } {
    let hasPagesTotal = false;
    let totalPages = 0;
    if (pagesTotal !== null && pagesTotal > 0) {
        hasPagesTotal = true;
        totalPages = pagesTotal;
    }
    let nextPagesRead = pagesRead;
    if (hasPagesTotal && nextPagesRead === null) {
        nextPagesRead = Math.round((progressRaw / PROGRESS_MAX) * totalPages);
    }
    if (hasPagesTotal && nextPagesRead !== null) {
        nextPagesRead = clamp(nextPagesRead, 0, totalPages);
    }
    let progress = Math.round(progressRaw * PROGRESS_SCALE) / PROGRESS_SCALE;
    if (hasPagesTotal) {
        progress =
            Math.round(
                ((nextPagesRead ?? 0) / totalPages) *
                    PROGRESS_MAX *
                    PROGRESS_SCALE,
            ) / PROGRESS_SCALE;
    }
    return { pagesRead: nextPagesRead, progress };
}
