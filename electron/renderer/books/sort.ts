import { normalizeShelfName } from "./shelf.js";
import { titleSortKey } from "./title_key.js";
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

export type SortDirection =
  | typeof SORT_DIRECTION_ASC
  | typeof SORT_DIRECTION_DESC;

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
  const leftText = String(left || "")
    .trim()
    .toLowerCase();
  const rightText = String(right || "")
    .trim()
    .toLowerCase();
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

function compareTitleText(left: OptionalString, right: OptionalString): number {
  const leftKey = titleSortKey(left);
  const rightKey = titleSortKey(right);
  const byKey = compareText(leftKey, rightKey);
  if (byKey !== 0) {
    return byKey;
  }
  return compareText(left, right);
}

type SortComparator = (
  leftBook: Book,
  rightBook: Book,
  finishDateByBookId: Record<string, string>,
) => number;

const compareByTitle: SortComparator = (leftBook, rightBook) => {
  return compareTitleText(leftBook.title, rightBook.title);
};

const SORT_COMPARATORS: Record<SortBy, SortComparator> = {
  [SORT_BY_TITLE]: compareByTitle,
  [SORT_BY_AUTHOR]: (leftBook, rightBook) =>
    compareText(leftBook.author, rightBook.author),
  [SORT_BY_PAGES_TOTAL]: (leftBook, rightBook) =>
    compareNumbers(leftBook.pages_total, rightBook.pages_total),
  [SORT_BY_PAGES_READ]: (leftBook, rightBook) =>
    compareNumbers(leftBook.pages_read, rightBook.pages_read),
  [SORT_BY_WORDS_TOTAL]: (leftBook, rightBook) =>
    compareNumbers(leftBook.words_total, rightBook.words_total),
  [SORT_BY_PROGRESS]: (leftBook, rightBook) =>
    compareNumbers(leftBook.progress_percent, rightBook.progress_percent),
  [SORT_BY_PRIORITY]: (leftBook, rightBook) =>
    compareNumbers(leftBook.priority, rightBook.priority),
  [SORT_BY_DIFFICULTY]: (leftBook, rightBook) =>
    compareNumbers(leftBook.difficulty, rightBook.difficulty),
  [SORT_BY_DEADLINE]: (leftBook, rightBook) =>
    compareText(leftBook.deadline, rightBook.deadline),
  [SORT_BY_ESTIMATED_FINISH]: (leftBook, rightBook, finishDateByBookId) => {
    return compareText(
      finishDateByBookId[leftBook.book_id],
      finishDateByBookId[rightBook.book_id],
    );
  },
  [SORT_BY_SHELF]: (leftBook, rightBook) => {
    return compareText(
      normalizeShelfName(leftBook.shelf),
      normalizeShelfName(rightBook.shelf),
    );
  },
};

function compareBySortKey(
  leftBook: Book,
  rightBook: Book,
  sortBy: SortBy,
  finishDateByBookId: Record<string, string>,
): number {
  const comparator = SORT_COMPARATORS[sortBy];
  return comparator(leftBook, rightBook, finishDateByBookId);
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
    const primary = compareBySortKey(
      leftBook,
      rightBook,
      sortBy,
      finishDateByBookId,
    );
    if (primary !== 0) {
      return primary * directionSign;
    }
    return compareTitleText(leftBook.title, rightBook.title);
  });
}
