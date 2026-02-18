// @ts-nocheck
import { el } from "../dom.js";
import { renderBookGrid } from "./card_view.js";
import { createBookDialog } from "./dialog.js";
import { hasSchedulableLength, normalizeBook, toPayloadBook } from "./model.js";
import { shelfFilterMatches, SHELF_FILTER_ALL } from "./shelf.js";
import { sortBooks } from "./sort.js";
import { ensureBooksToolbarControls, SORT_BY_TITLE, SORT_DIRECTION_ASC, SORT_DIRECTION_DESC, updateShelfFilterOptions, updateSortDirectionButton } from "./toolbar.js";
import { clamp } from "./utils.js";
let books = [];
let onBooksChanged = () => {};
let dialog = null;
const refs = {
  toolbar: null,
  grid: null,
  empty: null,
  addBtn: null,
  shelfFilterSelect: null,
  sortBySelect: null,
  sortDirectionBtn: null,
};
const viewState = {
  shelfFilter: SHELF_FILTER_ALL,
  sortBy: SORT_BY_TITLE,
  sortDirection: SORT_DIRECTION_ASC,
};
function parseFiniteNumber(raw) {
  if (raw === null || raw === undefined || raw === "") {
    return null;
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return null;
  }
  return value;
}
function applyPagesUpdate(nextBook, pagesUpdate, hasPagesTotal, pagesTotal) {
  if (pagesUpdate === null) {
    return false;
  }
  if (hasPagesTotal) {
    nextBook.pages_read = clamp(Math.round(pagesUpdate), 0, pagesTotal);
  } else {
    nextBook.pages_read = Math.max(0, Math.round(pagesUpdate));
  }
  return true;
}

function applyPercentUpdate(nextBook, pctUpdate, hasPagesUpdate, hasPagesTotal, pagesTotal) {
  if (pctUpdate === null || hasPagesUpdate) {
    return;
  }
  nextBook.progress_percent = Math.round(clamp(pctUpdate, 0, 100) * 10) / 10;
  if (hasPagesTotal) {
    nextBook.pages_read = Math.round((nextBook.progress_percent / 100) * pagesTotal);
  }
}

function reconcilePercentFromPages(nextBook, hasPagesTotal, pagesTotal) {
  if (!hasPagesTotal) {
    return;
  }
  if (nextBook.pages_read === null || nextBook.pages_read === undefined) {
    return;
  }
  const pct = (Number(nextBook.pages_read) / pagesTotal) * 100;
  nextBook.progress_percent = Math.round(clamp(pct, 0, 100) * 10) / 10;
}

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

export function updateBookProgress(bookId, updates = {}) {
  const idx = books.findIndex((book) => book.book_id === bookId);
  if (idx < 0) {
    return null;
  }
  const current = books[idx];
  const next = { ...current };
  const pagesTotal = Number(next.pages_total || 0);
  const hasPagesTotal = Number.isFinite(pagesTotal) && pagesTotal > 0;
  const pagesUpdate = parseFiniteNumber(updates.pagesRead);
  const hasPagesUpdate = applyPagesUpdate(next, pagesUpdate, hasPagesTotal, pagesTotal);
  const pctUpdate = parseFiniteNumber(updates.progressPercent);
  applyPercentUpdate(next, pctUpdate, hasPagesUpdate, hasPagesTotal, pagesTotal);
  reconcilePercentFromPages(next, hasPagesTotal, pagesTotal);
  books[idx] = normalizeBook(next);
  render();
  onBooksChanged();
  return { ...books[idx] };
}

function render() {
  updateShelfFilterOptions(refs.shelfFilterSelect, books, viewState.shelfFilter);
  updateSortDirectionButton(refs.sortDirectionBtn, viewState.sortDirection);
  const visibleBooks = sortBooks(books, viewState.sortBy, viewState.sortDirection).filter((book) => {
    return shelfFilterMatches(book, viewState.shelfFilter);
  });
  renderBookGrid({
    books: visibleBooks,
    allBooks: books,
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

export function collectBooks() {
  return books.map(toPayloadBook).filter((book) => book.title && hasSchedulableLength(book));
}

export function bindBooksUI(onChanged = () => {}) {
  onBooksChanged = onChanged;
  refs.toolbar = document.querySelector(".books-toolbar");
  if (!(refs.toolbar instanceof HTMLElement)) {
    return;
  }
  refs.grid = el("booksGrid");
  refs.empty = el("booksEmpty");
  refs.addBtn = el("addBookBtn");
  const toolbarControls = ensureBooksToolbarControls(refs.toolbar);
  refs.shelfFilterSelect = toolbarControls.shelfFilterSelect;
  refs.sortBySelect = toolbarControls.sortBySelect;
  refs.sortDirectionBtn = toolbarControls.sortDirectionBtn;
  refs.sortBySelect.addEventListener("change", () => {
    viewState.sortBy = refs.sortBySelect.value;
    render();
  });
  refs.shelfFilterSelect.addEventListener("change", () => {
    viewState.shelfFilter = refs.shelfFilterSelect.value;
    render();
  });
  refs.sortDirectionBtn.addEventListener("click", () => {
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
