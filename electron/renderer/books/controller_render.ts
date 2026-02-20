import type { PlannerScheduleRow } from '../app/types.js';
import { renderBookGrid } from './card_view.js';
import { finishDatesByBookId } from './finish_dates.js';
import { groupBooks } from './grouping.js';
import { shelfFilterMatches, SHELF_FILTER_ALL } from './shelf.js';
import { statusFilterMatches } from './status.js';
import { sortBooks } from './sort.js';
import {
  updateGroupByOptions,
  updateShelfFilterOptions,
  updateStatusFilterOptions,
  updateSortDirectionButton,
} from './toolbar.js';
import type { Book } from './types.js';
import type { BookDialogController, BooksControllerRefs, BooksViewState } from './controller_types.js';

type RenderBooksControllerArgs = {
  refs: BooksControllerRefs;
  books: Book[];
  scheduleRows: PlannerScheduleRow[];
  viewState: BooksViewState;
  dialog: BookDialogController | null;
  onBooksChanged: () => void;
  setBooks: (nextBooks: Book[]) => void;
  findBook: (bookId: string) => Book | null;
  rerender: () => void;
};

export function renderBooksController({
  refs,
  books,
  scheduleRows,
  viewState,
  dialog,
  onBooksChanged,
  setBooks,
  findBook,
  rerender,
}: RenderBooksControllerArgs): void {
  if (!(refs.shelfFilterSelect instanceof HTMLSelectElement)) {
    return;
  }
  if (!(refs.groupBySelect instanceof HTMLSelectElement)) {
    return;
  }
  if (!(refs.statusFilterSelect instanceof HTMLSelectElement)) {
    return;
  }
  if (!(refs.sortDirectionBtn instanceof HTMLButtonElement)) {
    return;
  }
  if (!(refs.grid instanceof HTMLElement) || !(refs.empty instanceof HTMLElement)) {
    return;
  }

  viewState.shelfFilter = updateShelfFilterOptions(refs.shelfFilterSelect, books, viewState.shelfFilter);
  viewState.statusFilter = updateStatusFilterOptions(refs.statusFilterSelect, viewState.statusFilter);
  viewState.groupBy = updateGroupByOptions(refs.groupBySelect, viewState.groupBy, viewState.shelfFilter);
  updateSortDirectionButton(refs.sortDirectionBtn, viewState.sortDirection);

  const showShelfMeta = viewState.shelfFilter === SHELF_FILTER_ALL;
  const finishDateByBookId = finishDatesByBookId(scheduleRows, books);

  const visibleBooks = sortBooks(books, viewState.sortBy, viewState.sortDirection, finishDateByBookId).filter((book) => {
    if (!shelfFilterMatches(book, viewState.shelfFilter)) {
      return false;
    }
    return statusFilterMatches(book, viewState.statusFilter);
  });

  const groups = groupBooks(visibleBooks, viewState.groupBy, finishDateByBookId);
  renderBookGrid({
    groups,
    finishDateByBookId,
    showShelfMeta,
    books: visibleBooks,
    allBooks: books,
    grid: refs.grid,
    empty: refs.empty,
    onEdit: (bookId) => {
      const book = findBook(bookId);
      if (book && dialog) {
        dialog.open(book);
      }
    },
    onRemove: (bookId) => {
      const nextBooks = books.filter((book) => book.book_id !== bookId);
      if (nextBooks.length === books.length) {
        return;
      }
      setBooks(nextBooks);
      rerender();
      onBooksChanged();
    },
  });
}
