// @ts-nocheck
import { COVER_PLACEHOLDER } from "./constants.js";
import { bookCoverSrc } from "./model.js";
import { metaLabel, progressLabel, subtitle, wordsLabel } from "./presenters.js";

function createCard(book, titleById) {
  const bookId = String(book.book_id || "");
  const title = String(book.title || "Untitled");
  const card = document.createElement("article");
  card.className = "book-card";
  card.dataset.bookId = bookId;

  const coverButton = document.createElement("button");
  coverButton.className = "book-cover-btn edit-book-btn";
  coverButton.dataset.bookId = bookId;
  coverButton.type = "button";
  const cover = bookCoverSrc(book);
  if (cover) {
    const img = document.createElement("img");
    img.src = cover;
    img.alt = `Cover of ${title}`;
    img.loading = "lazy";
    img.dataset.fallbackCover = "1";
    coverButton.append(img);
  } else {
    const fallback = document.createElement("div");
    fallback.className = "cover-fallback";
    fallback.textContent = "No Cover";
    coverButton.append(fallback);
  }
  card.append(coverButton);

  const meta = document.createElement("div");
  meta.className = "book-meta";
  const heading = document.createElement("h3");
  heading.className = "book-title";
  heading.textContent = title;
  meta.append(heading);
  const sub = document.createElement("p");
  sub.className = "book-subtitle";
  sub.textContent = subtitle(book);
  meta.append(sub);
  const stats = document.createElement("div");
  stats.className = "book-stats";
  [progressLabel(book), wordsLabel(book), metaLabel(book, titleById)].forEach((text) => {
    const span = document.createElement("span");
    span.textContent = text;
    stats.append(span);
  });
  meta.append(stats);

  const actions = document.createElement("div");
  actions.className = "book-actions";
  const removeBtn = document.createElement("button");
  removeBtn.className = "btn rm-btn remove-book-btn";
  removeBtn.type = "button";
  removeBtn.dataset.bookId = bookId;
  removeBtn.textContent = "Remove";
  actions.append(removeBtn);
  meta.append(actions);
  card.append(meta);
  return card;
}

function bindCardEvents(grid, { onEdit, onRemove }) {
  grid.querySelectorAll(".edit-book-btn").forEach((btn) => {
    btn.onclick = () => onEdit(btn.dataset.bookId || "");
  });
  grid.querySelectorAll(".remove-book-btn").forEach((btn) => {
    btn.onclick = () => onRemove(btn.dataset.bookId || "");
  });
  grid.querySelectorAll("img[data-fallback-cover='1']").forEach((img) => {
    img.addEventListener("error", () => {
      img.src = COVER_PLACEHOLDER;
      img.classList.add("is-empty");
    });
  });
}

export function renderBookGrid({ grid, empty, books, allBooks = [], onEdit, onRemove }) {
  let sourceBooks = books;
  if (allBooks.length) {
    sourceBooks = allBooks;
  }
  const titleById = Object.fromEntries(sourceBooks.map((book) => [book.book_id, book.title]));
  grid.replaceChildren(...books.map((book) => createCard(book, titleById)));
  empty.style.display = "block";
  if (books.length) {
    empty.style.display = "none";
  }
  bindCardEvents(grid, { onEdit, onRemove });
}
