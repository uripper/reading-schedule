import { clamp } from "./utils.js";
import type { Book, BookProgressUpdates } from "./types.js";
import type { PagesUpdateResult, PercentUpdateContext, ProgressTotals } from "../../types/books/progress.js";

/**
 * Parses numeric-like input and rejects blank/non-finite values.
 * @param raw Raw value from progress update payload.
 * @returns Finite number or `null` when input is invalid.
 */
function parseFiniteNumber(raw?: string | number): number | null {
  if (raw === undefined || raw === "") {
    return null;
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return null;
  }
  return value;
}

/**
 * Applies pages-read update to a mutable book copy.
 * @param book Book copy being updated.
 * @param pagesUpdate Parsed pages-read update value.
 * @param totals Total-page context used for clamping.
 * @returns Updated book and whether pages-read changed.
 */
function applyPagesUpdate(
  book: Book,
  pagesUpdate: number | null,
  totals: ProgressTotals,
): PagesUpdateResult {
  if (pagesUpdate === null) {
    return { book, hasPagesUpdate: false };
  }
  const pagesRead = Math.round(pagesUpdate);
  if (!totals.hasPagesTotal) {
    return {
      book: { ...book, pages_read: Math.max(0, pagesRead) },
      hasPagesUpdate: true,
    };
  }
  return {
    book: { ...book, pages_read: clamp(pagesRead, 0, totals.pagesTotal) },
    hasPagesUpdate: true,
  };
}

/**
 * Applies explicit percent update when pages-read was not directly edited.
 * @param book Book copy being updated.
 * @param pctUpdate Parsed progress-percent update value.
 * @param context Progress update context.
 * @returns Updated book with percent and inferred pages when applicable.
 */
function applyPercentUpdate(
  book: Book,
  pctUpdate: number | null,
  context: PercentUpdateContext,
): Book {
  if (pctUpdate === null || context.hasPagesUpdate) {
    return book;
  }
  const progressPercent = Math.round(clamp(pctUpdate, 0, 100) * 10) / 10;
  if (!context.hasPagesTotal) {
    return { ...book, progress_percent: progressPercent };
  }
  const pagesRead = Math.round((progressPercent / 100) * context.pagesTotal);
  return { ...book, progress_percent: progressPercent, pages_read: pagesRead };
}

/**
 * Recomputes progress percent from pages-read when total pages is known.
 * @param book Book copy being updated.
 * @param totals Total-page context used for percent calculation.
 * @returns Updated book with recomputed progress percent.
 */
function reconcilePercentFromPages(
  book: Book,
  totals: ProgressTotals,
): Book {
  if (!totals.hasPagesTotal) {
    return book;
  }
  if (book.pages_read === null) {
    return book;
  }
  const pct = (book.pages_read / totals.pagesTotal) * 100;
  const progressPercent = Math.round(clamp(pct, 0, 100) * 10) / 10;
  return { ...book, progress_percent: progressPercent };
}

/**
 * Applies progress-related updates and keeps page/percent fields consistent.
 * @param book Source book to update.
 * @param updates Partial progress update payload.
 * @returns Updated book copy with reconciled progress values.
 */
export function withUpdatedProgress(
  book: Book,
  updates: BookProgressUpdates = {},
): Book {
  let nextBook = { ...book };
  const pagesTotal = Number(nextBook.pages_total ?? 0);
  const totals: ProgressTotals = {
    hasPagesTotal: Number.isFinite(pagesTotal) && pagesTotal > 0,
    pagesTotal,
  };
  const pagesUpdate = parseFiniteNumber(updates.pagesRead ?? undefined);
  const pagesUpdateResult = applyPagesUpdate(nextBook, pagesUpdate, totals);
  nextBook = pagesUpdateResult.book;
  const pctUpdate = parseFiniteNumber(updates.progressPercent ?? undefined);
  nextBook = applyPercentUpdate(
    nextBook,
    pctUpdate,
    {
      hasPagesUpdate: pagesUpdateResult.hasPagesUpdate,
      hasPagesTotal: totals.hasPagesTotal,
      pagesTotal: totals.pagesTotal,
    },
  );
  nextBook = reconcilePercentFromPages(nextBook, totals);
  return nextBook;
}
