// @ts-nocheck
import { clamp } from "./utils.js";

function parseFiniteNumber(raw) {
  if (raw === null || raw === undefined || raw === "") {
    return null;
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return null;
  }
  return value;
}

function applyPagesUpdate(nextBook, pagesUpdate, hasPagesTotal, pagesTotal) {
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

function applyPercentUpdate(nextBook, pctUpdate, hasPagesUpdate, hasPagesTotal, pagesTotal) {
  if (pctUpdate === null || hasPagesUpdate) {
    return;
  }
  nextBook.progress_percent = Math.round(clamp(pctUpdate, 0, 100) * 10) / 10;
  if (hasPagesTotal) {
    nextBook.pages_read = Math.round((nextBook.progress_percent / 100) * pagesTotal);
  }
}

function reconcilePercentFromPages(nextBook, hasPagesTotal, pagesTotal) {
  if (!hasPagesTotal) {
    return;
  }
  if (nextBook.pages_read === null || nextBook.pages_read === undefined) {
    return;
  }
  const pct = (Number(nextBook.pages_read) / pagesTotal) * 100;
  nextBook.progress_percent = Math.round(clamp(pct, 0, 100) * 10) / 10;
}

export function withUpdatedProgress(book, updates = {}) {
  const nextBook = { ...book };
  const pagesTotal = Number(nextBook.pages_total || 0);
  const hasPagesTotal = Number.isFinite(pagesTotal) && pagesTotal > 0;
  const pagesUpdate = parseFiniteNumber(updates.pagesRead);
  const hasPagesUpdate = applyPagesUpdate(nextBook, pagesUpdate, hasPagesTotal, pagesTotal);
  const pctUpdate = parseFiniteNumber(updates.progressPercent);
  applyPercentUpdate(nextBook, pctUpdate, hasPagesUpdate, hasPagesTotal, pagesTotal);
  reconcilePercentFromPages(nextBook, hasPagesTotal, pagesTotal);
  return nextBook;
}
