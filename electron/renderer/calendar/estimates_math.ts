import type { Book } from "../../types/types.js";
import { WORDS_PER_PAGE } from "../books/constants.js";

const PERCENT_SCALE = 100;
const PERCENT_PRECISION_SCALE = 1000;

/**
 * Converts unknown numeric input into positive finite number.
 * @param value Unknown numeric-like value.
 * @returns Positive finite number or zero.
 */
function positiveFiniteNumber(value: unknown): number {
    const PARSED = Number(value ?? 0);
    if (!Number.isFinite(PARSED) || PARSED <= 0) {
        return 0;
    }
    return PARSED;
}

/**
 * Clamps progress percent to inclusive `0..100` range.
 * @param progressPercent Raw progress percent.
 * @returns Clamped percent.
 */
function clampPercent(progressPercent: number): number {
    return Math.min(PERCENT_SCALE, Math.max(0, progressPercent));
}

/**
 * Resolves full-word baseline for estimate math using book/totals fallbacks.
 * @param book Book model when available.
 * @param remainingWords Remaining words fallback from totals map.
 * @returns Full-word baseline for projection.
 */
export function fullWordsForBook(
    book: Book | null,
    remainingWords: number,
): number {
    const WORDS_TOTAL = positiveFiniteNumber(book?.words_total);
    if (WORDS_TOTAL > 0) {
        return WORDS_TOTAL;
    }
    const PAGES_TOTAL = positiveFiniteNumber(book?.pages_total);
    if (PAGES_TOTAL > 0) {
        return PAGES_TOTAL * WORDS_PER_PAGE;
    }
    return positiveFiniteNumber(remainingWords);
}

/**
 * Estimates words-read from book progress and full-word baseline.
 * @param book Book model when available.
 * @param fullWords Full-word baseline.
 * @returns Estimated words read.
 */
export function wordsReadFromBook(
    book: Book | null,
    fullWords: number,
): number {
    const PROGRESS_PERCENT = Number(book?.progress_percent ?? 0);
    const CLAMPED = clampPercent(PROGRESS_PERCENT);
    return Math.round((CLAMPED / PERCENT_SCALE) * fullWords);
}

/**
 * Projects page count from percent when total pages are known.
 * @param projectedPercent Projected percent.
 * @param pagesTotal Total pages.
 * @returns Projected pages or `null` when unavailable.
 */
export function projectedPages(
    projectedPercent: number,
    pagesTotal: number,
): number | null {
    if (pagesTotal <= 0) {
        return null;
    }
    return Math.round((projectedPercent / PERCENT_SCALE) * pagesTotal);
}

/**
 * Converts words-read to one-decimal completion percent.
 * @param wordsRead Estimated words read.
 * @param fullWords Full-word baseline.
 * @returns Percent complete.
 */
export function percentFromWords(wordsRead: number, fullWords: number): number {
    if (fullWords <= 0) {
        return 0;
    }
    return Math.round((wordsRead / fullWords) * PERCENT_PRECISION_SCALE) / 10;
}
