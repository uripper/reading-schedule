import {
  GROUP_BY_AUTHOR,
  GROUP_BY_FINISH_DATE,
  GROUP_BY_NONE,
  GROUP_BY_SHELF,
  GROUP_BY_TITLE_LETTER,
  type BookGroupBy,
} from './grouping.js';
import { SHELF_FILTER_ALL, SHELF_FILTER_UNSHELVED } from './shelf.js';
import {
  SORT_BY_AUTHOR,
  SORT_BY_DEADLINE,
  SORT_BY_DIFFICULTY,
  SORT_BY_ESTIMATED_FINISH,
  SORT_BY_PAGES_READ,
  SORT_BY_PAGES_TOTAL,
  SORT_BY_PRIORITY,
  SORT_BY_PROGRESS,
  SORT_BY_SHELF,
  SORT_BY_WORDS_TOTAL,
  type SortBy,
  type SortDirection,
} from './sort.js';
import { SORT_BY_TITLE } from './toolbar.js';
import type { BookStatusFilter } from './status.js';
import type { Book } from './types.js';

export type BooksControllerRefs = {
  toolbar: HTMLElement | null;
  grid: HTMLElement | null;
  empty: HTMLElement | null;
  addBtn: HTMLButtonElement | null;
  shelfFilterSelect: HTMLSelectElement | null;
  statusFilterSelect: HTMLSelectElement | null;
  sortBySelect: HTMLSelectElement | null;
  groupBySelect: HTMLSelectElement | null;
  sortDirectionBtn: HTMLButtonElement | null;
};

export type BookDialogController = {
  open: (book?: Book | null, options?: { defaultShelf?: string }) => void;
};

export type BooksViewState = {
  shelfFilter: string;
  statusFilter: BookStatusFilter;
  sortBy: SortBy;
  groupBy: BookGroupBy;
  sortDirection: SortDirection;
};

const SORT_BY_OPTIONS: SortBy[] = [
  SORT_BY_TITLE,
  SORT_BY_AUTHOR,
  SORT_BY_ESTIMATED_FINISH,
  SORT_BY_PAGES_TOTAL,
  SORT_BY_PAGES_READ,
  SORT_BY_WORDS_TOTAL,
  SORT_BY_PROGRESS,
  SORT_BY_PRIORITY,
  SORT_BY_DIFFICULTY,
  SORT_BY_DEADLINE,
  SORT_BY_SHELF,
];

const GROUP_BY_OPTIONS: BookGroupBy[] = [
  GROUP_BY_NONE,
  GROUP_BY_SHELF,
  GROUP_BY_FINISH_DATE,
  GROUP_BY_TITLE_LETTER,
  GROUP_BY_AUTHOR,
];

export function toSortBy(value: string): SortBy {
  const matched = SORT_BY_OPTIONS.find((option) => option === value);
  if (matched) {
    return matched;
  }
  return SORT_BY_TITLE;
}

export function toGroupBy(value: string): BookGroupBy {
  const matched = GROUP_BY_OPTIONS.find((option) => option === value);
  if (matched) {
    return matched;
  }
  return GROUP_BY_NONE;
}

export function defaultShelfForAddDialog(currentShelfFilter: string): string {
  if (currentShelfFilter === SHELF_FILTER_ALL || currentShelfFilter === SHELF_FILTER_UNSHELVED) {
    return '';
  }
  return currentShelfFilter;
}
