// @ts-nocheck
import { el } from "../dom.js";
import { renderBookGrid } from "./card_view.js";
import { createBookDialog } from "./dialog.js";
import { hasSchedulableLength, normalizeBook, toPayloadBook } from "./model.js";
import { clamp } from "./utils.js";

let books = [];
let onBooksChanged = () => {};
let dialog = null;

const refs = {
  grid: null,
  empty: null,
  addBtn: null,
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

export function updateBookProgress(bookId, updates = {}) {
  const idx = books.findIndex((book) => book.book_id === bookId);
  if (idx < 0) {
    return null;
  }

  const current = books[idx];
  const next = { ...current };
  const pagesTotal = Number(next.pages_total || 0);
  const hasPagesTotal = Number.isFinite(pagesTotal) && pagesTotal > 0;

  const pagesRaw = updates.pagesRead;
  const pagesNum = Number(pagesRaw);
  const hasPagesUpdate = pagesRaw !== null && pagesRaw !== undefined && pagesRaw !== "" && Number.isFinite(pagesNum);
  if (hasPagesUpdate) {
    if (hasPagesTotal) {
      next.pages_read = clamp(Math.round(pagesNum), 0, pagesTotal);
    } else {
      next.pages_read = Math.max(0, Math.round(pagesNum));
    }
  }

  const pctRaw = updates.progressPercent;
  const pctNum = Number(pctRaw);
  const hasPctUpdate = pctRaw !== null && pctRaw !== undefined && pctRaw !== "" && Number.isFinite(pctNum);
  if (hasPctUpdate && !hasPagesUpdate) {
    next.progress_percent = Math.round(clamp(pctNum, 0, 100) * 10) / 10;
    if (hasPagesTotal) {
      next.pages_read = Math.round((next.progress_percent / 100) * pagesTotal);
    }
  }

  if (hasPagesTotal && next.pages_read !== null && next.pages_read !== undefined) {
    next.progress_percent = Math.round(clamp((Number(next.pages_read) / pagesTotal) * 100, 0, 100) * 10) / 10;
  }

  books[idx] = normalizeBook(next);
  render();
  onBooksChanged();
  return { ...books[idx] };
}

function render() {
  renderBookGrid({
    books,
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
  refs.grid = el("booksGrid");
  refs.empty = el("booksEmpty");
  refs.addBtn = el("addBookBtn");
  dialog = createBookDialog(saveBook, { getBooks: () => books });
  refs.addBtn.onclick = () => dialog.open();
  render();
}
