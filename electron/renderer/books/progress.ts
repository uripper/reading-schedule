
import { clamp } from "./utils.js";
import type { Book, BookProgressUpdates } from "./types.js";

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

function applyPagesUpdate(nextBook: Book, pagesUpdate: number | null, hasPagesTotal: boolean, pagesTotal: number) {
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
    nextBook.pages_read = Math.round((nextBook.progress_percent / 100) * pagesTotal);
  }
}

function reconcilePercentFromPages(nextBook: Book, hasPagesTotal: boolean, pagesTotal: number) {
  if (!hasPagesTotal) {
    return;
  }
  if (nextBook.pages_read === null || nextBook.pages_read === undefined) {
    return;
  }
  const pct = (Number(nextBook.pages_read) / pagesTotal) * 100;
  nextBook.progress_percent = Math.round(clamp(pct, 0, 100) * 10) / 10;
}

export function withUpdatedProgress(book: Book, updates: BookProgressUpdates = {}): Book {
  const nextBook = { ...book };
  const pagesTotal = Number(nextBook.pages_total || 0);
  const hasPagesTotal = Number.isFinite(pagesTotal) && pagesTotal > 0;
  const pagesUpdate = parseFiniteNumber(updates.pagesRead ?? undefined);
  const hasPagesUpdate = applyPagesUpdate(nextBook, pagesUpdate, hasPagesTotal, pagesTotal);
  const pctUpdate = parseFiniteNumber(updates.progressPercent ?? undefined);
  applyPercentUpdate(nextBook, pctUpdate, hasPagesUpdate, hasPagesTotal, pagesTotal);
  reconcilePercentFromPages(nextBook, hasPagesTotal, pagesTotal);
  return nextBook;
}
