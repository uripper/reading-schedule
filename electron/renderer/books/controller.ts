import { el } from "../dom.js";
import type { PlannerScheduleRow } from "../app/types.js";
import { createBookDialog } from "./dialog.js";
import { GROUP_BY_NONE } from "./grouping.js";
import {
  clearMissingBlockedBy,
  hasSchedulableLength,
  normalizeBook,
  toPayloadBook,
} from "./model.js";
import { withUpdatedProgress } from "./progress.js";
import { hydrateBookCover, upsertBookById } from "./save.js";
import { BOOK_STATUS_FILTER_ALL, schedulableBook } from "./status.js";
import {
  ensureBooksToolbarControls,
  SORT_BY_TITLE,
  SORT_DIRECTION_ASC,
} from "./toolbar.js";
import type { Book, BookProgressUpdates } from "./types.js";
import { bindToolbarEvents } from "./controller_bindings.js";
import { renderBooksController } from "./controller_render.js";
import {
  defaultShelfForAddDialog,
  type BookDialogController,
  type BooksControllerRefs,
  type BooksViewState,
} from "./controller_types.js";

let books: Book[] = [];
let scheduleRows: PlannerScheduleRow[] = [];
let onBooksChanged: () => void = () => {};
let dialog: BookDialogController | null = null;

const refs: BooksControllerRefs = {
  toolbar: null,
  grid: null,
  empty: null,
  addBtn: null,
  shelfFilterSelect: null,
  statusFilterSelect: null,
  sortBySelect: null,
  groupBySelect: null,
  sortDirectionBtn: null,
};

const viewState: BooksViewState = {
  shelfFilter: "",
  statusFilter: BOOK_STATUS_FILTER_ALL,
  sortBy: SORT_BY_TITLE,
  groupBy: GROUP_BY_NONE,
  sortDirection: SORT_DIRECTION_ASC,
};

/**
 *
 * @param nextBooks
 */
function setBooks(nextBooks: Book[]): void {
  books = nextBooks;
}

/**
 *
 * @param bookId
 */
function findBook(bookId: string): Book | null {
  return books.find((book) => book.book_id === bookId) || null;
}

/**
 *
 */
function render(): void {
  renderBooksController({
    refs,
    books,
    scheduleRows,
    viewState,
    dialog,
    onBooksChanged,
    setBooks,
    findBook,
    rerender: render,
  });
}

/**
 *
 * @param bookId
 */
export function getBookById(bookId: string): Book | null {
  const book = findBook(bookId);
  if (!book) {
    return null;
  }
  return { ...book };
}

interface UpdateBookProgressOptions {
  notifyBooksChanged?: boolean;
}

/**
 *
 * @param bookId
 * @param updates
 * @param options
 */
export function updateBookProgress(
  bookId: string,
  updates: BookProgressUpdates = {},
  options: UpdateBookProgressOptions = {},
): Book | null {
  const idx = books.findIndex((book) => book.book_id === bookId);
  if (idx < 0) {
    return null;
  }

  const next = withUpdatedProgress(books[idx], updates);
  books[idx] = normalizeBook(next);
  render();

  if (options.notifyBooksChanged !== false) {
    onBooksChanged();
  }
  return { ...books[idx] };
}

/**
 *
 * @param book
 */
async function saveBook(book: Book): Promise<void> {
  const hydrated = await hydrateBookCover(book);
  books = upsertBookById(books, hydrated);
  render();
  onBooksChanged();
}

/**
 *
 * @param nextBooks
 */
export function fillBooks(nextBooks: Book[] = []): void {
  books = nextBooks.map(normalizeBook);
  render();
}

/**
 *
 * @param rows
 */
export function setBookScheduleRows(rows: PlannerScheduleRow[] = []): void {
  scheduleRows = [...rows];
  render();
}

/**
 *
 */
export function collectBooks() {
  const schedulableBooks = books.map(toPayloadBook).filter((book) => {
    return book.title && hasSchedulableLength(book) && schedulableBook(book);
  });
  return clearMissingBlockedBy(schedulableBooks);
}

/**
 *
 */
export function collectAllBooks() {
  return books.map(toPayloadBook).filter((book) => {
    return Boolean(book.title);
  });
}

/**
 *
 * @param onChanged
 */
export function bindBooksUI(onChanged: () => void = () => {}): void {
  onBooksChanged = onChanged;
  refs.toolbar = document.querySelector(".books-toolbar");
  if (!(refs.toolbar instanceof HTMLElement)) {
    return;
  }

  refs.grid = el("booksGrid");
  refs.empty = el("booksEmpty");
  refs.addBtn = el<HTMLButtonElement>("addBookBtn");

  const toolbarControls = ensureBooksToolbarControls(refs.toolbar);
  refs.shelfFilterSelect = toolbarControls.shelfFilterSelect;
  refs.statusFilterSelect = toolbarControls.statusFilterSelect;
  refs.sortBySelect = toolbarControls.sortBySelect;
  refs.groupBySelect = toolbarControls.groupBySelect;
  refs.sortDirectionBtn = toolbarControls.sortDirectionBtn;

  bindToolbarEvents({ refs, viewState, rerender: render });

  dialog = createBookDialog(saveBook, { getBooks: () => books });
  if (refs.addBtn) {
    refs.addBtn.onclick = () => {
      if (!dialog) {
        return;
      }
      dialog.open(null, {
        defaultShelf: defaultShelfForAddDialog(viewState.shelfFilter),
      });
    };
  }

  render();
}
