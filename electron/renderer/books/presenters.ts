import { WORDS_PER_PAGE } from "./constants.js";
import { shelfLabelForBook } from "./shelf.js";
import { BOOK_STATUS_READ } from "./status.js";
import { formatInt } from "./utils.js";
import type { Book, BookMetaOptions } from "../../types/types_books.js";
import type { BlockerMeta } from "../../types/types_books.js";

/**
 * Checks whether an optional numeric value is a positive finite number.
 * @param value Numeric value that may be nullish.
 * @returns `true` when value exists and is greater than zero.
 */
function hasPositiveNumber(value: number | null | undefined): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  return value > 0;
}

/**
 * Builds status-sensitive finish metadata text for one book.
 * @param book Book to describe.
 * @param finishDateByBookId Finish date lookup keyed by `book_id`.
 * @returns Metadata text or `null` when no finish text should be shown.
 */
function finishMetaPart(
  book: Book,
  finishDateByBookId: Record<string, string>,
): string | null {
  const finishDate = finishDateByBookId[book.book_id];
  if (!finishDate) {
    return null;
  }
  if (book.status === BOOK_STATUS_READ) {
    return `Finished ${finishDate}`;
  }
  return null;
}

/**
 * Builds blocker metadata text with title resolution when available.
 * @param book Book to describe.
 * @param titleById Book-title lookup keyed by `book_id`.
 * @returns Blocker metadata or `null` when no blocker is set.
 */
export function blockerMeta(
  book: Book,
  titleById: Record<string, string>,
): BlockerMeta | null {
  const blockerBookId = String(book.blocked_by ?? "").trim();
  if (blockerBookId === "") {
    return null;
  }
  const resolvedBlocker = titleById[blockerBookId];
  let blockerLabel = blockerBookId;
  if (typeof resolvedBlocker === "string" && resolvedBlocker !== "") {
    blockerLabel = resolvedBlocker;
  }
  return {
    blockerBookId,
    label: `After: ${blockerLabel}`,
  };
}

/**
 * Builds blocker metadata text with title resolution when available.
 * @param book Book to describe.
 * @param titleById Book-title lookup keyed by `book_id`.
 * @returns Metadata text or `null` when no blocker is set.
 */
function blockerMetaPart(book: Book, titleById: Record<string, string>): string | null {
  const blocker = blockerMeta(book, titleById);
  if (blocker === null) {
    return null;
  }
  return blocker.label;
}

/**
 * Builds the progress line shown in each book card.
 * @param book Book to present.
 * @returns Human-readable progress summary with percent and pages.
 */
export function progressLabel(book: Book): string {
  const pct = Number(book.progress_percent);
  const pagesRead = Math.max(0, Number(book.pages_read ?? 0));
  if (hasPositiveNumber(book.pages_total)) {
    const pagesTotal = Math.max(0, Number(book.pages_total ?? 0));
    return `${pct.toFixed(1)}% · ${formatInt(pagesRead)}/${formatInt(pagesTotal)} pages`;
  }
  return `${pct.toFixed(1)}% · ${formatInt(pagesRead)} pages read`;
}

/**
 * Builds word-count summary text for each book card.
 * @param book Book to present.
 * @returns Word total label or page-based estimate fallback.
 */
export function wordsLabel(book: Book): string {
  const wordsTotal = book.words_total;
  if (hasPositiveNumber(wordsTotal)) {
    return `${formatInt(wordsTotal)} words`;
  }
  const pagesTotal = book.pages_total;
  if (hasPositiveNumber(pagesTotal)) {
    return `${formatInt(Number(pagesTotal) * WORDS_PER_PAGE)} word estimate`;
  }
  return "No word estimate";
}

/**
 * Builds metadata line including status, completion date, due date, and blockers.
 * @param book Book to present.
 * @param options Optional context used to resolve titles and finish dates.
 * @returns Joined metadata text for card subtitle line.
 */
export function metaLabel(book: Book, options: BookMetaOptions = {}): string {
  const titleById = options.titleById ?? {};
  const finishDateByBookId = options.finishDateByBookId ?? {};
  const bits: string[] = [];

  const finishPart = finishMetaPart(book, finishDateByBookId);
  if (finishPart !== null) {
    bits.push(finishPart);
  }
  if (book.deadline !== null && book.deadline !== "") {
    bits.push(`Due: ${book.deadline}`);
  }
  if (options.showBlockerMeta !== false) {
    const blockerPart = blockerMetaPart(book, titleById);
    if (blockerPart !== null) {
      bits.push(blockerPart);
    }
  }
  if (options.showShelfMeta === true) {
    bits.push(`Shelf: ${shelfLabelForBook(book)}`);
  }
  return bits.join("\n");
}

/**
 * Builds secondary subtitle text for a book card.
 * @param book Book to present.
 * @returns Author text, lookup note, or fallback label.
 */
export function subtitle(book: Book): string {
  if (book.author !== "") {
    return book.author;
  }
  if (book.lookup_note !== "") {
    return book.lookup_note;
  }
  return "No author metadata";
}
