import { WORDS_PER_PAGE } from "../books/constants.js";
import type { Book } from "../books/types.js";

const PERCENT_SCALE = 100;
const PERCENT_PRECISION_SCALE = 1000;

export function clampPercent(progressPercent: number): number {
  return Math.min(PERCENT_SCALE, Math.max(0, progressPercent));
}

export function fullWordsForBook(book: Book | null, remainingWords: number): number {
  const wordsTotal = Number(book?.words_total || 0);
  if (Number.isFinite(wordsTotal) && wordsTotal > 0) {
    return wordsTotal;
  }
  const pagesTotal = Number(book?.pages_total || 0);
  if (Number.isFinite(pagesTotal) && pagesTotal > 0) {
    return pagesTotal * WORDS_PER_PAGE;
  }
  if (Number.isFinite(remainingWords) && remainingWords > 0) {
    return remainingWords;
  }
  return 0;
}

export function wordsReadFromBook(book: Book | null, fullWords: number): number {
  const progressPercent = Number(book?.progress_percent || 0);
  const clamped = clampPercent(progressPercent);
  return Math.round((clamped / PERCENT_SCALE) * fullWords);
}

export function projectedPages(
  projectedPercent: number,
  pagesTotal: number,
): number | null {
  if (pagesTotal <= 0) {
    return null;
  }
  return Math.round((projectedPercent / PERCENT_SCALE) * pagesTotal);
}

export function percentFromWords(wordsRead: number, fullWords: number): number {
  if (fullWords <= 0) {
    return 0;
  }
  return Math.round((wordsRead / fullWords) * PERCENT_PRECISION_SCALE) / 10;
}
