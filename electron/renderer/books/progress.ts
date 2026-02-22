import { clamp } from "./utils.js";
import type { Book, BookProgressUpdates } from "./types.js";

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
 * @param nextBook Mutable book copy being updated.
 * @param pagesUpdate Parsed pages-read update value.
 * @param hasPagesTotal Whether total pages is known and valid.
 * @param pagesTotal Total pages used for clamping.
 * @returns `true` when pages-read field was updated.
 */
function applyPagesUpdate(
  nextBook: Book,
  pagesUpdate: number | null,
  hasPagesTotal: boolean,
  pagesTotal: number,
) {
  if (pagesUpdate === null) {
    return false;
  }
  if (hasPagesTotal) {
    nextBook.pages_read = clamp(Math.round(pagesUpdate), 0, pagesTotal);
  } else {
    nextBook.pages_read = Math.max(0, Math.round(pagesUpdate));
  }
  return true;
}

/**
 * Applies explicit percent update when pages-read was not directly edited.
 * @param nextBook Mutable book copy being updated.
 * @param pctUpdate Parsed progress-percent update value.
 * @param hasPagesUpdate Whether pages-read was already updated.
 * @param hasPagesTotal Whether total pages is known and valid.
 * @param pagesTotal Total pages used to infer pages-read from percent.
 */
function applyPercentUpdate(
  nextBook: Book,
  pctUpdate: number | null,
  hasPagesUpdate: boolean,
  hasPagesTotal: boolean,
  pagesTotal: number,
) {
  if (pctUpdate === null || hasPagesUpdate) {
    return;
  }
  nextBook.progress_percent = Math.round(clamp(pctUpdate, 0, 100) * 10) / 10;
  if (hasPagesTotal) {
    nextBook.pages_read = Math.round(
      (nextBook.progress_percent / 100) * pagesTotal,
    );
  }
}

/**
 * Recomputes progress percent from pages-read when total pages is known.
 * @param nextBook Mutable book copy being updated.
 * @param hasPagesTotal Whether total pages is known and valid.
 * @param pagesTotal Total pages used for percent calculation.
 */
function reconcilePercentFromPages(
  nextBook: Book,
  hasPagesTotal: boolean,
  pagesTotal: number,
) {
  if (!hasPagesTotal) {
    return;
  }
  if (nextBook.pages_read === null || nextBook.pages_read === undefined) {
    return;
  }
  const pct = (Number(nextBook.pages_read) / pagesTotal) * 100;
  nextBook.progress_percent = Math.round(clamp(pct, 0, 100) * 10) / 10;
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
  const nextBook = { ...book };
  const pagesTotal = Number(nextBook.pages_total || 0);
  const hasPagesTotal = Number.isFinite(pagesTotal) && pagesTotal > 0;
  const pagesUpdate = parseFiniteNumber(updates.pagesRead ?? undefined);
  const hasPagesUpdate = applyPagesUpdate(
    nextBook,
    pagesUpdate,
    hasPagesTotal,
    pagesTotal,
  );
  const pctUpdate = parseFiniteNumber(updates.progressPercent ?? undefined);
  applyPercentUpdate(
    nextBook,
    pctUpdate,
    hasPagesUpdate,
    hasPagesTotal,
    pagesTotal,
  );
  reconcilePercentFromPages(nextBook, hasPagesTotal, pagesTotal);
  return nextBook;
}
