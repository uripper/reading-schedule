import { WORDS_PER_PAGE } from "./constants.js";
import { shelfLabelForBook } from "./shelf.js";
import { statusLabel } from "./status.js";
import { formatInt } from "./utils.js";
import type { Book, BookMetaOptions } from "./types.js";

/**
 * Builds the progress line shown in each book card.
 *
 * @param book Book to present.
 * @returns Human-readable progress summary with percent and pages.
 */
export function progressLabel(book: Book): string {
  const pct = Number(book.progress_percent || 0);
  const pagesRead = Math.max(0, Number(book.pages_read || 0));
  if (book.pages_total) {
    const pagesTotal = Math.max(0, Number(book.pages_total || 0));
    return `${pct.toFixed(1)}% · ${formatInt(pagesRead)}/${formatInt(pagesTotal)} pages`;
  }
  return `${pct.toFixed(1)}% · ${formatInt(pagesRead)} pages read`;
}

/**
 * Builds word-count summary text for each book card.
 *
 * @param book Book to present.
 * @returns Word total label or page-based estimate fallback.
 */
export function wordsLabel(book: Book): string {
  if (book.words_total) {
    return `${formatInt(book.words_total)} words`;
  }
  if (book.pages_total) {
    return `${formatInt(book.pages_total * WORDS_PER_PAGE)} word estimate`;
  }
  return "No word estimate";
}

/**
 * Builds metadata line including status, finish estimate, due date, and blockers.
 *
 * @param book Book to present.
 * @param options Optional context used to resolve titles and finish dates.
 * @returns Joined metadata text for card subtitle line.
 */
export function metaLabel(book: Book, options: BookMetaOptions = {}): string {
  const titleById = options.titleById || {};
  const finishDateByBookId = options.finishDateByBookId || {};
  const bits = [];
  bits.push(`Status ${statusLabel(book.status)}`);

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

/**
 * Builds secondary subtitle text for a book card.
 *
 * @param book Book to present.
 * @returns Author text, lookup note, or fallback label.
 */
export function subtitle(book: Book): string {
  return book.author || book.lookup_note || "No author metadata";
}
