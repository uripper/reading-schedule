import { el } from "../dom.js";
import type { PlannerScheduleRow } from "../../types/types.js";
import { createBookDialog, type BookSubmitPayload } from "./dialog.js";
import { GROUP_BY_NONE } from "./grouping.js";
import { clearMissingBlockedBy, hasSchedulableLength, normalizeBook, toPayloadBook } from "./model.js";
import { withUpdatedProgress } from "./progress.js";
import { hydrateBookCover, upsertBookById } from "./save.js";
import { applyScheduledDaysToShelfBooks } from "./save_scheduled_days.js";
import { BOOK_STATUS_FILTER_ALL, schedulableBook } from "./status.js";
import { ensureBooksToolbarControls, SORT_BY_TITLE, SORT_DIRECTION_ASC } from "./toolbar.js";
import type { Book, BookProgressUpdates } from "./types.js";
import { bindToolbarEvents } from "./controller_bindings.js";
import { renderBooksController } from "./controller_render.js";
import { defaultShelfForAddDialog, type BookDialogController, type BooksControllerRefs, type BooksViewState } from "./controller_types.js";
import type { BindBooksUIOptions, UpdateBookProgressOptions } from "../../types/books_types.js";

let books: Book[] = [];
let scheduleRows: PlannerScheduleRow[] = [];
const DEFAULT_ON_BOOKS_CHANGED = (): void => {
  // No-op default callback.
};
const DEFAULT_ON_ESTIMATED_FINISH_NAVIGATE = (_dateKey: string): void => {
  // No-op default callback.
};
let onBooksChanged: () => void = DEFAULT_ON_BOOKS_CHANGED;
let onEstimatedFinishNavigate: (dateKey: string) => void =
  DEFAULT_ON_ESTIMATED_FINISH_NAVIGATE;
let dialog: BookDialogController | null = null;

const refs: BooksControllerRefs = {
  toolbar: null,
  grid: null,
  empty: null,
  addBtn: null,
  titleFilterInput: null,
  shelfFilterSelect: null,
  statusFilterSelect: null,
  sortBySelect: null,
  groupBySelect: null,
  sortDirectionBtn: null,
};

const viewState: BooksViewState = {
  titleFilter: "",
  shelfFilter: "",
  statusFilter: BOOK_STATUS_FILTER_ALL,
  sortBy: SORT_BY_TITLE,
  groupBy: GROUP_BY_NONE,
  sortDirection: SORT_DIRECTION_ASC,
};

/**
 * Replaces the in-memory books collection used by the books controller.
 * @param nextBooks Books to render and edit in the current session.
 */
function setBooks(nextBooks: Book[]): void {
  books = nextBooks;
}

/**
 * Finds a mutable in-memory book by id.
 * @param bookId Stable `book_id` to locate.
 * @returns Matching book instance when present; otherwise `null`.
 */
function findBook(bookId: string): Book | null {
  return books.find((book) => book.book_id === bookId) ?? null;
}

/**
 * Renders the books area using current controller state and view filters.
 */
function render(): void {
  renderBooksController({
    refs,
    books,
    scheduleRows,
    viewState,
    dialog,
    onBooksChanged,
    onEstimatedFinishNavigate,
    setBooks,
    findBook,
    rerender: render,
  });
}

/**
 * Reads a book by id and returns a defensive copy for callers.
 * @param bookId Stable `book_id` to locate.
 * @returns Cloned book when found; otherwise `null`.
 */
export function getBookById(bookId: string): Book | null {
  const book = findBook(bookId);
  if (!book) {
    return null;
  }
  return { ...book };
}

/**
 * Applies progress field updates to a single book and refreshes the UI.
 * @param bookId Stable `book_id` to update.
 * @param updates Partial progress values to merge into the current book.
 * @param options Behavioral flags such as change notification control.
 * @returns Updated cloned book when found; otherwise `null`.
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
 * Persists an edited book, including optional cover hydration, then rerenders.
 * @param payload Book save payload including optional shelf-day propagation flag.
 */
async function saveBook(payload: BookSubmitPayload): Promise<void> {
  const hydrated = await hydrateBookCover(payload.book);
  let nextBooks = upsertBookById(books, hydrated);
  if (payload.applyScheduledDaysToShelf) {
    nextBooks = applyScheduledDaysToShelfBooks(nextBooks, hydrated);
  }
  books = nextBooks;
  render();
  onBooksChanged();
}

/**
 * Replaces controller books from persisted payload data.
 * @param nextBooks Raw books to normalize and render.
 */
export function fillBooks(nextBooks: Book[] = []): void {
  books = nextBooks.map(normalizeBook);
  render();
}

/**
 * Stores planner schedule rows used for finish-date and grouping metadata.
 * @param rows Schedule rows aligned to the current reading plan.
 */
export function setBookScheduleRows(rows: PlannerScheduleRow[] = []): void {
  scheduleRows = [...rows];
  render();
}

/**
 * Collects books that should be sent to planner scheduling logic.
 * @returns Normalized planner payload books that are title-complete and schedulable.
 */
export function collectBooks(): Book[] {
  const schedulableBooks = books.map(toPayloadBook).filter((book) => {
    const normalizedTitle = book.title.trim();
    return (
      normalizedTitle.length > 0 &&
      hasSchedulableLength(book) &&
      schedulableBook(book)
    );
  });
  return clearMissingBlockedBy(schedulableBooks);
}

/**
 * Collects every titled book for persistence regardless of schedulable state.
 * @returns Normalized payload books with non-empty titles.
 */
export function collectAllBooks(): Book[] {
  return books.map(toPayloadBook).filter((book) => {
    return book.title.trim().length > 0;
  });
}

/**
 * Binds books toolbar, dialog, and grid events for interactive editing.
 * @param onChanged Callback fired after persisted book list mutations.
 * @param options Optional UI behavior hooks.
 */
export function bindBooksUI(
  onChanged: () => void = DEFAULT_ON_BOOKS_CHANGED,
  options: BindBooksUIOptions = {},
): void {
  onBooksChanged = onChanged;
  const estimatedFinishNavigateHandler = options.onEstimatedFinishNavigate;
  if (typeof estimatedFinishNavigateHandler === "function") {
    onEstimatedFinishNavigate = (dateKey: string): void => {
      estimatedFinishNavigateHandler(dateKey);
    };
  } else {
    onEstimatedFinishNavigate = DEFAULT_ON_ESTIMATED_FINISH_NAVIGATE;
  }
  refs.toolbar = document.querySelector(".books-toolbar");
  if (!(refs.toolbar instanceof HTMLElement)) {
    return;
  }

  refs.grid = el("booksGrid");
  refs.empty = el("booksEmpty");
  refs.addBtn = el<HTMLButtonElement>("addBookBtn");

  const toolbarControls = ensureBooksToolbarControls(refs.toolbar);
  refs.titleFilterInput = toolbarControls.titleFilterInput;
  refs.shelfFilterSelect = toolbarControls.shelfFilterSelect;
  refs.statusFilterSelect = toolbarControls.statusFilterSelect;
  refs.sortBySelect = toolbarControls.sortBySelect;
  refs.groupBySelect = toolbarControls.groupBySelect;
  refs.sortDirectionBtn = toolbarControls.sortDirectionBtn;

  bindToolbarEvents({ refs, viewState, rerender: render });

  dialog = createBookDialog(saveBook, { getBooks: () => books });
  refs.addBtn.onclick = () => {
    if (!dialog) {
      return;
    }
    dialog.open(null, {
      defaultShelf: defaultShelfForAddDialog(viewState.shelfFilter),
    });
  };

  render();
}
