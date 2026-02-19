import { el } from '../dom.js';
import { renderBookGrid } from './card_view.js';
import { createBookDialog } from './dialog.js';
import { finishDatesByBookId } from './finish_dates.js';
import { GROUP_BY_NONE, groupBooks } from './grouping.js';
import { hasSchedulableLength, normalizeBook, toPayloadBook } from './model.js';
import { withUpdatedProgress } from './progress.js';
import { shelfFilterMatches, SHELF_FILTER_ALL } from './shelf.js';
import { sortBooks } from './sort.js';
import {
  ensureBooksToolbarControls,
  SORT_BY_TITLE,
  SORT_DIRECTION_ASC,
  SORT_DIRECTION_DESC,
  updateGroupByOptions,
  updateShelfFilterOptions,
  updateSortDirectionButton,
} from './toolbar.js';

let books = [];
let scheduleRows = [];
let onBooksChanged = () => {};
let dialog = null;

const refs = {
  toolbar: null,
  grid: null,
  empty: null,
  addBtn: null,
  shelfFilterSelect: null,
  sortBySelect: null,
  groupBySelect: null,
  sortDirectionBtn: null,
};

const viewState = {
  shelfFilter: SHELF_FILTER_ALL,
  sortBy: SORT_BY_TITLE,
  groupBy: GROUP_BY_NONE,
  sortDirection: SORT_DIRECTION_ASC,
};

function findBook(bookId) {
  return books.find((book) => book.book_id === bookId) || null;
}

export function getBookById(bookId) {
  const book = findBook(bookId);
  if (!book) {
    return null;
  }
  return { ...book };
}

export function updateBookProgress(bookId, updates = {}, options = {}) {
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

function render() {
  viewState.shelfFilter = updateShelfFilterOptions(refs.shelfFilterSelect, books, viewState.shelfFilter);
  viewState.groupBy = updateGroupByOptions(refs.groupBySelect, viewState.groupBy, viewState.shelfFilter);
  updateSortDirectionButton(refs.sortDirectionBtn, viewState.sortDirection);

  const showShelfMeta = viewState.shelfFilter === SHELF_FILTER_ALL;
  const finishDateByBookId = finishDatesByBookId(scheduleRows);

  const visibleBooks = sortBooks(books, viewState.sortBy, viewState.sortDirection, finishDateByBookId).filter((book) => {
    return shelfFilterMatches(book, viewState.shelfFilter);
  });

  const groups = groupBooks(visibleBooks, viewState.groupBy, finishDateByBookId);

  renderBookGrid({
    books: visibleBooks,
    groups,
    allBooks: books,
    finishDateByBookId,
    showShelfMeta,
    grid: refs.grid,
    empty: refs.empty,
    onEdit: (bookId) => {
      const book = findBook(bookId);
      if (book) {
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

async function withDownloadedCover(book) {
  if (!book.cover_url || book.cover_local_path) {
    return book;
  }

  try {
    const localCover = await globalThis.plannerApi.downloadCover(book.cover_url, book.book_id);
    if (localCover) {
      return { ...book, cover_local_path: localCover };
    }
    return book;
  } catch {
    return book;
  }
}

async function saveBook(book) {
  const hydrated = await withDownloadedCover(book);
  const idx = books.findIndex((row) => row.book_id === hydrated.book_id);
  if (idx >= 0) {
    books[idx] = hydrated;
  } else {
    books.push(hydrated);
  }

  render();
  onBooksChanged();
}

export function fillBooks(nextBooks) {
  books = (nextBooks || []).map(normalizeBook);
  render();
}

export function setBookScheduleRows(rows = []) {
  scheduleRows = [...rows];
  render();
}

export function collectBooks() {
  return books.map(toPayloadBook).filter((book) => {
    return book.title && hasSchedulableLength(book);
  });
}

export function bindBooksUI(onChanged = () => {}) {
  onBooksChanged = onChanged;
  refs.toolbar = document.querySelector('.books-toolbar');
  if (!(refs.toolbar instanceof HTMLElement)) {
    return;
  }

  refs.grid = el('booksGrid');
  refs.empty = el('booksEmpty');
  refs.addBtn = el('addBookBtn');

  const toolbarControls = ensureBooksToolbarControls(refs.toolbar);
  refs.shelfFilterSelect = toolbarControls.shelfFilterSelect;
  refs.sortBySelect = toolbarControls.sortBySelect;
  refs.groupBySelect = toolbarControls.groupBySelect;
  refs.sortDirectionBtn = toolbarControls.sortDirectionBtn;

  refs.sortBySelect.addEventListener('change', () => {
    viewState.sortBy = refs.sortBySelect.value;
    render();
  });

  refs.shelfFilterSelect.addEventListener('change', () => {
    viewState.shelfFilter = refs.shelfFilterSelect.value;
    render();
  });

  refs.groupBySelect.addEventListener('change', () => {
    viewState.groupBy = refs.groupBySelect.value;
    render();
  });

  refs.sortDirectionBtn.addEventListener('click', () => {
    let nextDirection = SORT_DIRECTION_ASC;
    if (viewState.sortDirection === SORT_DIRECTION_ASC) {
      nextDirection = SORT_DIRECTION_DESC;
    }
    viewState.sortDirection = nextDirection;
    render();
  });

  dialog = createBookDialog(saveBook, { getBooks: () => books });
  refs.addBtn.onclick = () => dialog.open();
  render();
}
