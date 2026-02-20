import { COVER_PLACEHOLDER } from './constants.js';
import { bookCoverSrc } from './model.js';
import { metaLabel, progressLabel, subtitle, wordsLabel } from './presenters.js';
import { statusLabel } from './status.js';
import type { Book } from './types.js';
import type { BookGroup } from './grouping.js';
type CardHandlers = {
  onEdit: (bookId: string) => void;
  onRemove: (bookId: string) => void;
};
type RenderBookGridOptions = {
  grid: HTMLElement;
  empty: HTMLElement;
  books: Book[];
  groups?: BookGroup[];
  allBooks?: Book[];
  finishDateByBookId?: Record<string, string>;
  showShelfMeta?: boolean;
  onEdit: (bookId: string) => void;
  onRemove: (bookId: string) => void;
};
function createCard(
  book: Book,
  titleById: Record<string, string>,
  finishDateByBookId: Record<string, string>,
  showShelfMeta: boolean,
): HTMLElement {
  const bookId = String(book.book_id || '');
  const title = String(book.title || 'Untitled');

  const card = document.createElement('article');
  card.className = 'book-card';
  card.dataset.bookId = bookId;
  card.dataset.status = String(book.status || '');

  const coverButton = document.createElement('button');
  coverButton.className = 'book-cover-btn edit-book-btn';
  coverButton.dataset.bookId = bookId;
  coverButton.type = 'button';

  const cover = bookCoverSrc(book);
  if (cover) {
    const img = document.createElement('img');
    img.src = cover;
    img.alt = `Cover of ${title}`;
    img.loading = 'lazy';
    img.dataset.fallbackCover = '1';
    coverButton.append(img);
  } else {
    const fallback = document.createElement('div');
    fallback.className = 'cover-fallback';
    fallback.textContent = 'No Cover';
    coverButton.append(fallback);
  }
  card.append(coverButton);

  const meta = document.createElement('div');
  meta.className = 'book-meta';

  const heading = document.createElement('h3');
  heading.className = 'book-title';
  heading.textContent = title;

  const status = document.createElement('span');
  status.className = `book-status-pill is-${book.status}`;
  status.textContent = statusLabel(book.status);
  meta.append(heading, status);

  const sub = document.createElement('p');
  sub.className = 'book-subtitle';
  sub.textContent = subtitle(book);
  meta.append(sub);

  const stats = document.createElement('div');
  stats.className = 'book-stats';
  const metaText = metaLabel(book, { titleById, finishDateByBookId, showShelfMeta });
  [progressLabel(book), wordsLabel(book), metaText].forEach((text) => {
    const span = document.createElement('span');
    span.textContent = text;
    stats.append(span);
  });
  meta.append(stats);

  const actions = document.createElement('div');
  actions.className = 'book-actions';
  const removeBtn = document.createElement('button');
  removeBtn.className = 'btn rm-btn remove-book-btn';
  removeBtn.type = 'button';
  removeBtn.dataset.bookId = bookId;
  removeBtn.textContent = 'Remove';
  actions.append(removeBtn);
  meta.append(actions);

  card.append(meta);
  return card;
}
function bindCardEvents(rootNode: HTMLElement, { onEdit, onRemove }: CardHandlers): void {
  rootNode.querySelectorAll<HTMLButtonElement>('.edit-book-btn').forEach((btn) => {
    btn.onclick = () => onEdit(btn.dataset.bookId || '');
  });

  rootNode.querySelectorAll<HTMLButtonElement>('.remove-book-btn').forEach((btn) => {
    btn.onclick = () => onRemove(btn.dataset.bookId || '');
  });

  rootNode.querySelectorAll<HTMLImageElement>("img[data-fallback-cover='1']").forEach((img) => {
    img.addEventListener('error', () => {
      img.src = COVER_PLACEHOLDER;
      img.classList.add('is-empty');
    });
  });
}
function titleByIdMap(books: Book[], allBooks: Book[]): Record<string, string> {
  let sourceBooks = books;
  if (allBooks.length) {
    sourceBooks = allBooks;
  }
  return Object.fromEntries(sourceBooks.map((book) => [book.book_id, book.title]));
}
function createGroupSection(
  group: BookGroup,
  titleById: Record<string, string>,
  finishDateByBookId: Record<string, string>,
  showShelfMeta: boolean,
): HTMLElement {
  const section = document.createElement('section');
  section.className = 'books-group';
  section.dataset.groupKey = String(group.key || '');

  const heading = document.createElement('h3');
  heading.className = 'books-group-heading';
  heading.textContent = `${group.label} (${group.books.length})`;

  const row = document.createElement('div');
  row.className = 'books-group-row';
  const cards = group.books.map((book) => {
    return createCard(book, titleById, finishDateByBookId, showShelfMeta);
  });
  row.append(...cards);

  section.append(heading, row);
  return section;
}
function renderFlatBooks(
  grid: HTMLElement,
  books: Book[],
  titleById: Record<string, string>,
  finishDateByBookId: Record<string, string>,
  showShelfMeta: boolean,
): void {
  grid.classList.remove('is-grouped');
  const cards = books.map((book) => {
    return createCard(book, titleById, finishDateByBookId, showShelfMeta);
  });
  grid.replaceChildren(...cards);
}
function renderGroupedBooks(
  grid: HTMLElement,
  groups: BookGroup[],
  titleById: Record<string, string>,
  finishDateByBookId: Record<string, string>,
  showShelfMeta: boolean,
): void {
  grid.classList.add('is-grouped');
  const sections = groups.map((group) => {
    return createGroupSection(group, titleById, finishDateByBookId, showShelfMeta);
  });
  grid.replaceChildren(...sections);
}
export function renderBookGrid({
  grid,
  empty,
  books,
  groups = [],
  allBooks = [],
  finishDateByBookId = {},
  showShelfMeta = true,
  onEdit,
  onRemove,
}: RenderBookGridOptions): void {
  const titleById = titleByIdMap(books, allBooks);

  if (groups.length) {
    renderGroupedBooks(grid, groups, titleById, finishDateByBookId, showShelfMeta);
  } else {
    renderFlatBooks(grid, books, titleById, finishDateByBookId, showShelfMeta);
  }

  empty.style.display = 'block';
  if (books.length) {
    empty.style.display = 'none';
  }

  bindCardEvents(grid, { onEdit, onRemove });
}
