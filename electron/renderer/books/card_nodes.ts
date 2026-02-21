import { bookCoverSrc } from "./model.js";
import { metaLabel, progressLabel, subtitle, wordsLabel } from "./presenters.js";
import { statusLabel } from "./status.js";
import type { Book } from "./types.js";

export type CardRenderContext = {
  finishDateByBookId: Record<string, string>;
  showShelfMeta: boolean;
  titleById: Record<string, string>;
};

export function createCardNode(book: Book, context: CardRenderContext): HTMLElement {
  const bookId = String(book.book_id || "");
  const title = String(book.title || "Untitled");
  const card = document.createElement("article");
  card.className = "book-card";
  card.dataset.bookId = bookId;
  card.dataset.status = String(book.status || "");
  const coverButton = document.createElement("button");
  coverButton.className = "book-cover-btn edit-book-btn";
  coverButton.dataset.bookId = bookId;
  coverButton.type = "button";
  const cover = bookCoverSrc(book);
  if (cover) {
    const image = document.createElement("img");
    image.src = cover;
    image.alt = `Cover of ${title}`;
    image.loading = "lazy";
    image.dataset.fallbackCover = "1";
    coverButton.append(image);
  } else {
    const fallback = document.createElement("div");
    fallback.className = "cover-fallback";
    fallback.textContent = "No Cover";
    coverButton.append(fallback);
  }
  const meta = document.createElement("div");
  meta.className = "book-meta";
  const heading = document.createElement("h3");
  heading.className = "book-title";
  heading.textContent = title;
  const status = document.createElement("span");
  status.className = `book-status-pill is-${book.status}`;
  status.textContent = statusLabel(book.status);
  const sub = document.createElement("p");
  sub.className = "book-subtitle";
  sub.textContent = subtitle(book);
  const stats = document.createElement("div");
  stats.className = "book-stats";
  const metaText = metaLabel(book, context);
  [progressLabel(book), wordsLabel(book), metaText].forEach((text) => {
    const span = document.createElement("span");
    span.textContent = text;
    stats.append(span);
  });
  const actions = document.createElement("div");
  actions.className = "book-actions";
  const removeBtn = document.createElement("button");
  removeBtn.className = "btn rm-btn remove-book-btn";
  removeBtn.type = "button";
  removeBtn.dataset.bookId = bookId;
  removeBtn.textContent = "Remove";
  actions.append(removeBtn);
  meta.append(heading, status, sub, stats, actions);
  card.append(coverButton, meta);
  return card;
}

export function titleByIdMap(books: Book[], allBooks: Book[]): Record<string, string> {
  let sourceBooks = books;
  if (allBooks.length) {
    sourceBooks = allBooks;
  }
  return Object.fromEntries(sourceBooks.map((book) => [book.book_id, book.title]));
}
