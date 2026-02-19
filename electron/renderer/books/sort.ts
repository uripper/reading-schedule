
import { normalizeShelfName } from "./shelf.js";
import type { Book } from "./types.js";

export const SORT_BY_TITLE = "title";
export const SORT_BY_AUTHOR = "author";
export const SORT_BY_PAGES_TOTAL = "pages_total";
export const SORT_BY_PAGES_READ = "pages_read";
export const SORT_BY_WORDS_TOTAL = "words_total";
export const SORT_BY_PROGRESS = "progress_percent";
export const SORT_BY_PRIORITY = "priority";
export const SORT_BY_DIFFICULTY = "difficulty";
export const SORT_BY_DEADLINE = "deadline";
export const SORT_BY_ESTIMATED_FINISH = "estimated_finish";
export const SORT_BY_SHELF = "shelf";

export const SORT_DIRECTION_ASC = "asc";
export const SORT_DIRECTION_DESC = "desc";

export type SortBy =
  | typeof SORT_BY_TITLE
  | typeof SORT_BY_AUTHOR
  | typeof SORT_BY_PAGES_TOTAL
  | typeof SORT_BY_PAGES_READ
  | typeof SORT_BY_WORDS_TOTAL
  | typeof SORT_BY_PROGRESS
  | typeof SORT_BY_PRIORITY
  | typeof SORT_BY_DIFFICULTY
  | typeof SORT_BY_DEADLINE
  | typeof SORT_BY_ESTIMATED_FINISH
  | typeof SORT_BY_SHELF;

export type SortDirection = typeof SORT_DIRECTION_ASC | typeof SORT_DIRECTION_DESC;

type OptionalNumber = number | null | undefined;
type OptionalString = string | null | undefined;

function compareNumbers(left: OptionalNumber, right: OptionalNumber): number {
  const leftMissing = left === null || left === undefined;
  const rightMissing = right === null || right === undefined;
  if (leftMissing && rightMissing) {
    return 0;
  }
  if (leftMissing) {
    return 1;
  }
  if (rightMissing) {
    return -1;
  }
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function compareText(left: OptionalString, right: OptionalString): number {
  const leftText = String(left || "").trim().toLowerCase();
  const rightText = String(right || "").trim().toLowerCase();
  const leftMissing = !leftText;
  const rightMissing = !rightText;
  if (leftMissing && rightMissing) {
    return 0;
  }
  if (leftMissing) {
    return 1;
  }
  if (rightMissing) {
    return -1;
  }
  return leftText.localeCompare(rightText, undefined, { sensitivity: "base" });
}

function compareBySortKey(
  leftBook: Book,
  rightBook: Book,
  sortBy: SortBy,
  finishDateByBookId: Record<string, string>,
): number {
  if (sortBy === SORT_BY_AUTHOR) {
    return compareText(leftBook.author, rightBook.author);
  }
  if (sortBy === SORT_BY_PAGES_TOTAL) {
    return compareNumbers(leftBook.pages_total, rightBook.pages_total);
  }
  if (sortBy === SORT_BY_PAGES_READ) {
    return compareNumbers(leftBook.pages_read, rightBook.pages_read);
  }
  if (sortBy === SORT_BY_WORDS_TOTAL) {
    return compareNumbers(leftBook.words_total, rightBook.words_total);
  }
  if (sortBy === SORT_BY_PROGRESS) {
    return compareNumbers(leftBook.progress_percent, rightBook.progress_percent);
  }
  if (sortBy === SORT_BY_PRIORITY) {
    return compareNumbers(leftBook.priority, rightBook.priority);
  }
  if (sortBy === SORT_BY_DIFFICULTY) {
    return compareNumbers(leftBook.difficulty, rightBook.difficulty);
  }
  if (sortBy === SORT_BY_DEADLINE) {
    return compareText(leftBook.deadline, rightBook.deadline);
  }
  if (sortBy === SORT_BY_ESTIMATED_FINISH) {
    return compareText(finishDateByBookId[leftBook.book_id], finishDateByBookId[rightBook.book_id]);
  }
  if (sortBy === SORT_BY_SHELF) {
    return compareText(normalizeShelfName(leftBook.shelf), normalizeShelfName(rightBook.shelf));
  }
  return compareText(leftBook.title, rightBook.title);
}

export function sortBooks(
  books: Book[] = [],
  sortBy: SortBy = SORT_BY_TITLE,
  sortDirection: SortDirection = SORT_DIRECTION_ASC,
  finishDateByBookId: Record<string, string> = {},
): Book[] {
  let directionSign = 1;
  if (sortDirection === SORT_DIRECTION_DESC) {
    directionSign = -1;
  }
  return [...books].sort((leftBook, rightBook) => {
    const primary = compareBySortKey(leftBook, rightBook, sortBy, finishDateByBookId);
    if (primary !== 0) {
      return primary * directionSign;
    }
    return compareText(leftBook.title, rightBook.title);
  });
}
