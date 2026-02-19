import { el } from '../dom.js';
import { renderBookGrid } from './card_view.js';
import { createBookDialog } from './dialog.js';
import { finishDatesByBookId } from './finish_dates.js';
import { GROUP_BY_NONE, GROUP_BY_AUTHOR, GROUP_BY_FINISH_DATE, GROUP_BY_SHELF, GROUP_BY_TITLE_LETTER, groupBooks } from './grouping.js';
import { hasSchedulableLength, normalizeBook, toPayloadBook } from './model.js';
import { withUpdatedProgress } from './progress.js';
import { hydrateBookCover, upsertBookById } from './save.js';
import { shelfFilterMatches, SHELF_FILTER_ALL } from './shelf.js';
import {
  BOOK_STATUS_FILTER_ALL,
  normalizeStatusFilter,
  schedulableBook,
  statusFilterMatches,
  type BookStatusFilter,
} from './status.js';
import {
  sortBooks,
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
import type { PlannerScheduleRow } from '../app/types.js';
import type { Book, BookProgressUpdates } from './types.js';
import type { BookGroupBy } from './grouping.js';
import {
  ensureBooksToolbarControls,
  SORT_BY_TITLE,
  SORT_DIRECTION_ASC,
  SORT_DIRECTION_DESC,
  updateGroupByOptions,
  updateShelfFilterOptions,
  updateStatusFilterOptions,
  updateSortDirectionButton,
} from './toolbar.js';

type BooksControllerRefs = {
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

type BookDialogController = {
  open: (book?: Book | null) => void;
};

type BooksViewState = {
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

function toSortBy(value: string): SortBy {
  const matched = SORT_BY_OPTIONS.find((option) => option === value);
  if (matched) {
    return matched;
  }
  return SORT_BY_TITLE;
}

function toGroupBy(value: string): BookGroupBy {
  const matched = GROUP_BY_OPTIONS.find((option) => option === value);
  if (matched) {
    return matched;
  }
  return GROUP_BY_NONE;
}

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
  shelfFilter: SHELF_FILTER_ALL,
  statusFilter: BOOK_STATUS_FILTER_ALL,
  sortBy: SORT_BY_TITLE,
  groupBy: GROUP_BY_NONE,
  sortDirection: SORT_DIRECTION_ASC,
};
function findBook(bookId: string): Book | null {
  return books.find((book) => book.book_id === bookId) || null;
}

export function getBookById(bookId: string): Book | null {
  const book = findBook(bookId);
  if (!book) {
    return null;
  }
  return { ...book };
}

type UpdateBookProgressOptions = {
  notifyBooksChanged?: boolean;
};

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

function render(): void {
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
      const next = books.filter((book) => book.book_id !== bookId);
      if (next.length === books.length) {
        return;
      }
      books = next;
      render();
      onBooksChanged();
    },
  });
}

async function saveBook(book: Book): Promise<void> {
  const hydrated = await hydrateBookCover(book);
  books = upsertBookById(books, hydrated);
  render();
  onBooksChanged();
}

export function fillBooks(nextBooks: Book[] = []): void {
  books = nextBooks.map(normalizeBook);
  render();
}

export function setBookScheduleRows(rows: PlannerScheduleRow[] = []): void {
  scheduleRows = [...rows];
  render();
}

export function collectBooks() {
  return books.map(toPayloadBook).filter((book) => {
    return book.title && hasSchedulableLength(book) && schedulableBook(book);
  });
}

export function collectAllBooks() {
  return books.map(toPayloadBook).filter((book) => {
    return Boolean(book.title);
  });
}

export function bindBooksUI(onChanged: () => void = () => {}): void {
  onBooksChanged = onChanged;
  refs.toolbar = document.querySelector('.books-toolbar');
  if (!(refs.toolbar instanceof HTMLElement)) {
    return;
  }

  refs.grid = el<HTMLElement>('booksGrid');
  refs.empty = el<HTMLElement>('booksEmpty');
  refs.addBtn = el<HTMLButtonElement>('addBookBtn');

  const toolbarControls = ensureBooksToolbarControls(refs.toolbar);
  refs.shelfFilterSelect = toolbarControls.shelfFilterSelect;
  refs.statusFilterSelect = toolbarControls.statusFilterSelect;
  refs.sortBySelect = toolbarControls.sortBySelect;
  refs.groupBySelect = toolbarControls.groupBySelect;
  refs.sortDirectionBtn = toolbarControls.sortDirectionBtn;

  if (!(refs.sortBySelect instanceof HTMLSelectElement)) {
    throw new TypeError('Books toolbar sort-by control is missing or invalid.');
  }
  if (!(refs.shelfFilterSelect instanceof HTMLSelectElement)) {
    throw new TypeError('Books toolbar shelf-filter control is missing or invalid.');
  }
  if (!(refs.statusFilterSelect instanceof HTMLSelectElement)) {
    throw new TypeError('Books toolbar status-filter control is missing or invalid.');
  }
  if (!(refs.groupBySelect instanceof HTMLSelectElement)) {
    throw new TypeError('Books toolbar group-by control is missing or invalid.');
  }
  if (!(refs.sortDirectionBtn instanceof HTMLButtonElement)) {
    throw new TypeError('Books toolbar sort-direction control is missing or invalid.');
  }

  const {
    sortBySelect,
    shelfFilterSelect,
    statusFilterSelect,
    groupBySelect,
    sortDirectionBtn,
  } = refs;

  sortBySelect.addEventListener('change', () => {
    viewState.sortBy = toSortBy(sortBySelect.value);
    render();
  });

  shelfFilterSelect.addEventListener('change', () => {
    viewState.shelfFilter = shelfFilterSelect.value;
    render();
  });

  statusFilterSelect.addEventListener('change', () => {
    viewState.statusFilter = normalizeStatusFilter(statusFilterSelect.value);
    render();
  });

  groupBySelect.addEventListener('change', () => {
    viewState.groupBy = toGroupBy(groupBySelect.value);
    render();
  });

  sortDirectionBtn.addEventListener('click', () => {
    let nextDirection: SortDirection = SORT_DIRECTION_ASC;
    if (viewState.sortDirection === SORT_DIRECTION_ASC) {
      nextDirection = SORT_DIRECTION_DESC;
    }
    viewState.sortDirection = nextDirection;
    render();
  });

  dialog = createBookDialog(saveBook, { getBooks: () => books });
  refs.addBtn.onclick = () => {
    if (dialog) {
      dialog.open();
    }
  };
  render();
}
