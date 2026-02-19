// @ts-nocheck

import { WORDS_PER_PAGE } from "./constants.js";
import { shelfLabelForBook } from "./shelf.js";
import { formatInt } from "./utils.js";

export function progressLabel(book) {
  const pct = Number(book.progress_percent || 0);
  const pagesRead = Math.max(0, Number(book.pages_read || 0));
  if (book.pages_total) {
    const pagesTotal = Math.max(0, Number(book.pages_total || 0));
    return `${pct.toFixed(1)}% · ${formatInt(pagesRead)}/${formatInt(pagesTotal)} pages`;
  }
  return `${pct.toFixed(1)}% · ${formatInt(pagesRead)} pages read`;
}

export function wordsLabel(book) {
  if (book.words_total) {
    return `${formatInt(book.words_total)} words`;
  }
  if (book.pages_total) {
    return `${formatInt(book.pages_total * WORDS_PER_PAGE)} word estimate`;
  }
  return "No word estimate";
}

export function metaLabel(book, options = {}) {
  const titleById = options.titleById || {};
  const finishDateByBookId = options.finishDateByBookId || {};
  const bits = [];

  const finishDate = finishDateByBookId[book.book_id];
  if (finishDate) {
    bits.push(`Est. finish ${finishDate}`);
  }
  if (book.deadline) {
    bits.push(`Due ${book.deadline}`);
  }
  if (book.blocked_by) {
    let blockerLabel = book.blocked_by;
    if (titleById[book.blocked_by]) {
      blockerLabel = titleById[book.blocked_by];
    }
    bits.push(`After ${blockerLabel}`);
  }
  if (options.showShelfMeta) {
    bits.push(`Shelf ${shelfLabelForBook(book)}`);
  }
  if (!bits.length) {
    return "No schedule metadata";
  }
  return bits.join(" · ");
}

export function subtitle(book) {
  return book.author || book.lookup_note || "No author metadata";
}
