import { bookCoverSrc } from "./model.js";
import {
  metaLabel,
  progressLabel,
  subtitle,
  wordsLabel,
} from "./presenters.js";
import { bindReadCardHolo } from "./card_holo.js";
import { navigateToEstimatedFinishDate } from "./estimated_finish_navigation.js";
import {
  BOOK_STATUS_IN_PROGRESS,
  BOOK_STATUS_READ,
  BOOK_STATUS_TO_READ,
  statusLabel,
} from "./status.js";
import type { Book } from "./types.js";

export interface CardRenderContext {
  finishDateByBookId: Record<string, string>;
  onEstimatedFinishNavigate(dateKey: string): void;
  showShelfMeta: boolean;
  titleById: Record<string, string>;
}

const CARD_CLASS = "book-card";
const READ_CARD_CLASS = "is-read-card";
const ESTIMATED_FINISH_BUTTON_CLASS = "book-estimated-finish-btn";
const ESTIMATED_FINISH_ICON = "🗓";
const ESTIMATED_FINISH_LABEL = "Est. Finish";

/**
 * Builds class-name text for a card based on book status.
 * @param status Book status value.
 * @returns Class-name text for card root element.
 */
export function cardClassNameForStatus(status: Book["status"]): string {
  if (status === BOOK_STATUS_READ) {
    return `${CARD_CLASS} ${READ_CARD_CLASS}`;
  }
  return CARD_CLASS;
}

/**
 * Resolves estimated finish date shown as interactive card control.
 * @param book Book model to inspect.
 * @param finishDateByBookId Finish date lookup keyed by `book_id`.
 * @returns Estimated finish day key or `null` when not applicable.
 */
function estimatedFinishDate(
  book: Book,
  finishDateByBookId: Record<string, string>,
): string | null {
  if (
    book.status !== BOOK_STATUS_IN_PROGRESS &&
    book.status !== BOOK_STATUS_TO_READ
  ) {
    return null;
  }
  const finishDate = finishDateByBookId[book.book_id];
  if (!finishDate) {
    return null;
  }
  return finishDate;
}

/**
 * Builds interactive estimated-finish control for schedulable books.
 * @param dateKey Estimated finish date key.
 * @param context Shared card render context.
 * @returns Configured button element.
 */
function estimatedFinishButton(
  dateKey: string,
  context: CardRenderContext,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = ESTIMATED_FINISH_BUTTON_CLASS;
  button.dataset.finishDate = dateKey;
  button.setAttribute(
    "aria-label",
    `Open schedule for estimated finish ${dateKey}`,
  );
  button.title = "Open in schedule";
  button.textContent = `${ESTIMATED_FINISH_ICON} ${ESTIMATED_FINISH_LABEL} ${dateKey}`;
  button.onclick = () => {
    navigateToEstimatedFinishDate(dateKey, (nextDateKey) => {
      context.onEstimatedFinishNavigate(nextDateKey);
    });
  };
  return button;
}

/**
 * Creates a full book card node including cover, metadata, and actions.
 * @param book Book model to render.
 * @param context Shared render context for cross-book metadata.
 * @returns Rendered book card element.
 */
export function createCardNode(
  book: Book,
  context: CardRenderContext,
): HTMLElement {
  const bookId = String(book.book_id || "");
  const title = String(book.title || "Untitled");
  const card = document.createElement("article");
  card.className = cardClassNameForStatus(book.status);
  card.dataset.bookId = bookId;
  card.dataset.status = String(book.status);
  const coverButton = document.createElement("button");
  coverButton.className = "book-cover-btn edit-book-btn";
  coverButton.dataset.bookId = bookId;
  coverButton.type = "button";
  const cover = bookCoverSrc(book);
  if (cover) {
    coverButton.classList.add("has-cover");
    const image = document.createElement("img");
    image.src = cover;
    image.alt = `Cover of ${title}`;
    image.loading = "lazy";
    image.dataset.fallbackCover = "1";
    coverButton.append(image);
    if (book.status === BOOK_STATUS_READ) {
      bindReadCardHolo(coverButton);
    }
  } else {
    const fallback = document.createElement("div");
    fallback.className = "cover-fallback";
    fallback.textContent = "No Cover";
    coverButton.append(fallback);
  }
  const meta = document.createElement("div");
  meta.className = "book-meta";
  const heading = document.createElement("h1");
  heading.className = "book-title";
  heading.textContent = title;
  const status = document.createElement("span");
  status.className = `book-status-pill is-${book.status}`;
  status.textContent = statusLabel(book.status);
  const finishDate = estimatedFinishDate(book, context.finishDateByBookId);
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
  if (finishDate !== null) {
    actions.append(estimatedFinishButton(finishDate, context));
  }
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

/**
 * Builds a map of book id to title, preferring full-catalog input when present.
 * @param books Current filtered/rendered books.
 * @param allBooks Full catalog books.
 * @returns Book id to title map.
 */
export function titleByIdMap(
  books: Book[],
  allBooks: Book[],
): Record<string, string> {
  let sourceBooks = books;
  if (allBooks.length) {
    sourceBooks = allBooks;
  }
  return Object.fromEntries(
    sourceBooks.map((book) => [book.book_id, book.title]),
  );
}
