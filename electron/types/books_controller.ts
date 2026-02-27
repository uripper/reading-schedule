import type { PlannerScheduleRow } from "./types_planner.js";
import type { Book, BookGroupBy, BookStatusFilter, SortBy, SortDirection } from "./types_books.js";
import type { OpenDialogOptions } from "./types_books.js";

export interface UpdateBookProgressOptions {
  notifyBooksChanged?: boolean;
}

export interface BindBooksUIOptions {
  onEstimatedFinishNavigate?(this: void, dateKey: string): void;
}

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

export interface BookDialogController {
  open(book?: Book | null, options?: OpenDialogOptions): void;
}

export interface BooksViewState {
  titleFilter: string;
  shelfFilter: string;
  statusFilter: BookStatusFilter;
  sortBy: SortBy;
  groupBy: BookGroupBy;
  sortDirection: SortDirection;
}

export interface BindToolbarEventsArgs {
  refs: BooksControllerRefs;
  viewState: BooksViewState;
  rerender(): void;
}

export interface RenderableBooksRefs {
  shelfFilterSelect: HTMLSelectElement;
  groupBySelect: HTMLSelectElement;
  statusFilterSelect: HTMLSelectElement;
  sortDirectionBtn: HTMLButtonElement;
  grid: HTMLElement;
  empty: HTMLElement;
}

export interface RenderBooksControllerArgs {
  refs: BooksControllerRefs;
  books: Book[];
  scheduleRows: PlannerScheduleRow[];
  viewState: BooksViewState;
  dialog: BookDialogController | null;
  onBooksChanged(): void;
  onEstimatedFinishNavigate(dateKey: string): void;
  setBooks(nextBooks: Book[]): void;
  findBook(bookId: string): Book | null;
  rerender(): void;
}
