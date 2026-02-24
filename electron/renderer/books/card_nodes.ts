import { bookCoverSrc } from "./model.js";
import {
  afterBookLinkButton,
  estimatedFinishButton,
  type CardNavigationActions,
} from "./card_navigation_buttons.js";
import { scrollToBookCard } from "./card_scroll_target.js";
import {
  blockerMeta,
  metaLabel,
  progressLabel,
  subtitle,
  wordsLabel,
} from "./presenters.js";
import { bindReadCardHolo } from "./card_holo.js";
import {
  BOOK_STATUS_IN_PROGRESS,
  BOOK_STATUS_READ,
  BOOK_STATUS_TO_READ,
  statusLabel,
} from "./status.js";
import type { Book } from "./types.js";
export interface CardRenderContext extends CardNavigationActions {
  finishDateByBookId: Record<string, string>;
  showBlockerMeta: boolean;
  showShelfMeta: boolean;
  showWordCount: boolean;
  titleById: Record<string, string>;
}

const CARD_CLASS = "book-card";
const READ_CARD_CLASS = "is-read-card";
const PRE_LINE_WHITESPACE = "pre-line";

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
 * Builds the stats section for one book card.
 * @param book Book model used for progress/meta labels.
 * @param context Shared render context for metadata options and lookups.
 * @returns Configured stats wrapper element.
 */
function cardStatsNode(book: Book, context: CardRenderContext): HTMLDivElement {
  const stats = document.createElement("div");
  stats.className = "book-stats";
  const baseMetaText = metaLabel(book, {
    finishDateByBookId: context.finishDateByBookId,
    showShelfMeta: context.showShelfMeta,
    titleById: context.titleById,
    showBlockerMeta: false,
  });
  let blocker: ReturnType<typeof blockerMeta> = null;
  if (context.showBlockerMeta) {
    blocker = blockerMeta(book, context.titleById);
  }
  const statLines: Array<{ text: string; preserveLineBreaks: boolean }> = [
    { text: progressLabel(book), preserveLineBreaks: false },
  ];
  if (context.showWordCount) {
    statLines.push({ text: wordsLabel(book), preserveLineBreaks: false });
  }
  if (baseMetaText !== "") {
    statLines.push({ text: baseMetaText, preserveLineBreaks: true });
  }
  statLines.forEach((line) => {
    const span = document.createElement("span");
    span.textContent = line.text;
    if (line.preserveLineBreaks) {
      span.style.whiteSpace = PRE_LINE_WHITESPACE;
    }
    stats.append(span);
  });
  if (blocker !== null) {
    stats.append(
      afterBookLinkButton(blocker.label, blocker.blockerBookId, scrollToBookCard),
    );
  }
  return stats;
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
  const stats = cardStatsNode(book, context);
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
  meta.append(heading, sub, status, stats, actions);
  card.append(coverButton, meta);
  return card;
}
