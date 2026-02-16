import { COVER_PLACEHOLDER } from "./constants.js";
import { bookCoverSrc } from "./model.js";
import { metaLabel, progressLabel, subtitle, wordsLabel } from "./presenters.js";
import { escapeHtml } from "./utils.js";

function cardTemplate(book) {
  const cover = bookCoverSrc(book);
  const id = escapeHtml(book.book_id);
  const safeTitle = escapeHtml(book.title || "Untitled");
  const img = cover
    ? `<img src="${escapeHtml(cover)}" alt="Cover of ${safeTitle}" loading="lazy" data-fallback-cover="1">`
    : '<div class="cover-fallback">No Cover</div>';

  return `<article class="book-card" data-book-id="${id}">
<button class="book-cover-btn edit-book-btn" data-book-id="${id}" type="button">${img}</button>
<div class="book-meta">
<h3 class="book-title">${safeTitle}</h3>
<p class="book-subtitle">${escapeHtml(subtitle(book))}</p>
<div class="book-stats"><span>${escapeHtml(progressLabel(book))}</span><span>${escapeHtml(wordsLabel(book))}</span><span>${escapeHtml(metaLabel(book))}</span></div>
<div class="book-actions"><button class="btn rm-btn remove-book-btn" type="button" data-book-id="${id}">Remove</button></div>
</div></article>`;
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

export function renderBookGrid({ grid, empty, books, onEdit, onRemove }) {
  grid.innerHTML = books.map(cardTemplate).join("");
  empty.style.display = books.length ? "none" : "block";
  bindCardEvents(grid, { onEdit, onRemove });
}
