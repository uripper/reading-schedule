import { el } from "../dom.js";
import { renderBookGrid } from "./card_view.js";
import { createBookDialog } from "./dialog.js";
import { hasSchedulableLength, normalizeBook, toPayloadBook } from "./model.js";

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

function render() {
  renderBookGrid({
    grid: refs.grid,
    empty: refs.empty,
    books,
    onEdit: (bookId) => {
      const book = findBook(bookId);
      if (book) dialog.open(book);
    },
    onRemove: (bookId) => {
      const next = books.filter((book) => book.book_id !== bookId);
      if (next.length === books.length) return;
      books = next;
      render();
      onBooksChanged();
    },
  });
}

async function withDownloadedCover(book) {
  if (!book.cover_url || book.cover_local_path) return book;
  try {
    const localCover = await window.plannerApi.downloadCover(book.cover_url, book.book_id);
    return localCover ? { ...book, cover_local_path: localCover } : book;
  } catch {
    return book;
  }
}

async function saveBook(book) {
  const hydrated = await withDownloadedCover(book);
  const idx = books.findIndex((row) => row.book_id === hydrated.book_id);
  if (idx >= 0) books[idx] = hydrated;
  else books.push(hydrated);
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
  dialog = createBookDialog(saveBook);
  refs.addBtn.onclick = () => dialog.open();
  render();
}
