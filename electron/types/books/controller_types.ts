import type { OpenDialogOptions } from "../../renderer/books/dialog.js";
import type { BookGroupBy } from "../../renderer/books/grouping.js";
import type { SortBy, SortDirection } from "../../renderer/books/sort.js";
import type { BookStatusFilter } from "../../renderer/books/status.js";
import type { Book } from "../../renderer/books/types.js";

export interface BooksControllerRefs {
  toolbar: HTMLElement | null;
  grid: HTMLElement | null;
  empty: HTMLElement | null;
  addBtn: HTMLButtonElement | null;
  titleFilterInput: HTMLInputElement | null;
  shelfFilterSelect: HTMLSelectElement | null;
  statusFilterSelect: HTMLSelectElement | null;
  sortBySelect: HTMLSelectElement | null;
  groupBySelect: HTMLSelectElement | null;
  sortDirectionBtn: HTMLButtonElement | null;
}

/**
 * Minimal API surface exposed by the add/edit book dialog controller.
 */
export interface BookDialogController {
  open(book?: Book | null, options?: OpenDialogOptions): void;
}

/**
 * Mutable books screen state backed by toolbar controls.
 */
export interface BooksViewState {
  titleFilter: string;
  shelfFilter: string;
  statusFilter: BookStatusFilter;
  sortBy: SortBy;
  groupBy: BookGroupBy;
  sortDirection: SortDirection;
}
