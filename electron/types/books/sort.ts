import type { SORT_BY_AUTHOR, SORT_BY_DEADLINE, SORT_BY_DIFFICULTY, SORT_BY_ESTIMATED_FINISH, SORT_BY_PAGES_READ, SORT_BY_PAGES_TOTAL, SORT_BY_PRIORITY, SORT_BY_PROGRESS, SORT_BY_SHELF, SORT_BY_TITLE, SORT_BY_WORDS_TOTAL, SORT_DIRECTION_ASC, SORT_DIRECTION_DESC } from "../../renderer/books/sort.js";
import type { Book } from "../../renderer/books/types.js";

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

export type OptionalNumber = number | null | undefined;

export type OptionalString = string | null | undefined;

export type SortComparator = (
  leftBook: Book,
  rightBook: Book,
  finishDateByBookId: Record<string, string>,
) => number;
