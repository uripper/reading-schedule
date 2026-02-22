import type { PlannerScheduleRow } from "../app/types.js";
import { renderBookGrid } from "./card_view.js";
import { finishDatesByBookId } from "./finish_dates.js";
import { groupBooks } from "./grouping.js";
import { SHELF_FILTER_ALL } from "./shelf.js";
import {
  resolveRenderableRefs,
  visibleBooksForView,
} from "./controller_render_helpers.js";
import {
  updateGroupByOptions,
  updateShelfFilterOptions,
  updateStatusFilterOptions,
  updateSortDirectionButton,
} from "./toolbar.js";
import type { Book } from "./types.js";
import type {
  BookDialogController,
  BooksControllerRefs,
  BooksViewState,
} from "./controller_types.js";

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
  const renderRefs = resolveRenderableRefs(refs);
  if (!renderRefs) {
    return;
  }

  viewState.shelfFilter = updateShelfFilterOptions(
    renderRefs.shelfFilterSelect,
    books,
    viewState.shelfFilter,
  );
  viewState.statusFilter = updateStatusFilterOptions(
    renderRefs.statusFilterSelect,
    viewState.statusFilter,
  );
  viewState.groupBy = updateGroupByOptions(
    renderRefs.groupBySelect,
    viewState.groupBy,
    viewState.shelfFilter,
  );
  updateSortDirectionButton(renderRefs.sortDirectionBtn, viewState.sortDirection);

  const showShelfMeta = viewState.shelfFilter === SHELF_FILTER_ALL;
  const finishDateByBookId = finishDatesByBookId(scheduleRows, books);
  const visibleBooks = visibleBooksForView(books, viewState, finishDateByBookId);

  const groups = groupBooks(
    visibleBooks,
    viewState.groupBy,
    finishDateByBookId,
  );
  renderBookGrid({
    groups,
    finishDateByBookId,
    showShelfMeta,
    books: visibleBooks,
    allBooks: books,
    grid: renderRefs.grid,
    empty: renderRefs.empty,
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
