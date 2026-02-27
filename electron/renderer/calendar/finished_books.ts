import type { ManualSessionBook } from "./details_types.js";
import type { BookFinishLookup, CompletedBookRow } from "../../types/calendar_month.js";

/**
 * Resolves title text for completed-book row display.
 * @param bookTitle Canonical book title from model.
 * @param fallbackTitle Fallback title from session-book lookup.
 * @returns Non-empty title text.
 */
function completedBookTitle(bookTitle: string, fallbackTitle: string): string {
  const normalizedBookTitle = bookTitle.trim();
  if (normalizedBookTitle !== "") {
    return normalizedBookTitle;
  }
  const normalizedFallbackTitle = fallbackTitle.trim();
  if (normalizedFallbackTitle !== "") {
    return normalizedFallbackTitle;
  }
  return "Untitled";
}

/**
 * Builds completed-book rows grouped by finished date.
 * @param sessionBooks Session-book options from calendar handlers.
 * @param getBookById Book resolver callback by id.
 * @returns Map of date keys to completed-book rows.
 */
export function buildCompletedBookRowsByDate(
  sessionBooks: ManualSessionBook[],
  getBookById: (bookId: string) => BookFinishLookup | null,
): Record<string, CompletedBookRow[]> {
  const rowsByDate: Record<string, CompletedBookRow[]> = {};
  const seenBookIds = new Set<string>();
  sessionBooks.forEach((entry) => {
    const bookId = entry.bookId.trim();
    if (bookId === "") {
      return;
    }
    if (seenBookIds.has(bookId)) {
      return;
    }
    seenBookIds.add(bookId);
    const book = getBookById(bookId);
    if (book === null) {
      return;
    }
    const finishedAt = String(book.finished_at ?? "").trim();
    if (finishedAt === "") {
      return;
    }
    if (!(finishedAt in rowsByDate)) {
      rowsByDate[finishedAt] = [];
    }
    rowsByDate[finishedAt].push({
      book_id: bookId,
      date: finishedAt,
      finish: true,
      minutes: 0,
      title: completedBookTitle(book.title, entry.title),
    });
  });
  return rowsByDate;
}

/**
 * Builds summary text for finished books on a selected day.
 * @param rows Completed-book rows for a day.
 * @returns Summary text or empty string when no titles exist.
 */
export function finishedBooksSummaryText(rows: CompletedBookRow[]): string {
  const seenTitles = new Set<string>();
  const finishedTitles: string[] = [];
  rows.forEach((row) => {
    const title = row.title.trim();
    if (title === "") {
      return;
    }
    if (seenTitles.has(title)) {
      return;
    }
    seenTitles.add(title);
    finishedTitles.push(title);
  });
  if (finishedTitles.length === 0) {
    return "";
  }
  return `Finished: ${finishedTitles.join(", ")}`;
}
