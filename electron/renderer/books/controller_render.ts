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

interface RenderBooksControllerArgs {
  refs: BooksControllerRefs;
  books: Book[];
  scheduleRows: PlannerScheduleRow[];
  viewState: BooksViewState;
  dialog: BookDialogController | null;
  onBooksChanged(): void;
  setBooks(nextBooks: Book[]): void;
  findBook(bookId: string): Book | null;
  rerender(): void;
}

/**
 * Renders toolbar-driven books content and wires row-level edit/remove actions.
 * @param root0 Render inputs for books controller view.
 * @param root0.refs Controller DOM references required for rendering.
 * @param root0.books Full in-memory book list.
 * @param root0.scheduleRows Planner schedule rows used for finish-date metadata.
 * @param root0.viewState Active shelf/status/sort/group options.
 * @param root0.dialog Edit dialog controller when available.
 * @param root0.onBooksChanged Callback fired when collection mutations occur.
 * @param root0.setBooks State updater used after remove operations.
 * @param root0.findBook Lookup helper used before opening edit dialog.
 * @param root0.rerender Callback to refresh the books view after state updates.
 */
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
