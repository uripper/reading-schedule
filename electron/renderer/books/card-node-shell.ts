import type { Book, CardRenderContext } from "../../types/types.ts";
import { bindReadCardHolo } from "./card_holo.ts";
import { estimatedFinishButton } from "./card_navigation_buttons.ts";
import { bookCoverSrc } from "./model_normalize.ts";
import { subtitle } from "./presenters.ts";
import {
    BOOK_STATUS_IN_PROGRESS,
    BOOK_STATUS_READ,
    BOOK_STATUS_TO_READ,
    statusLabel,
} from "./status_catalog.ts";

const CARD_CLASS = "book-card";
const READ_CARD_CLASS = "is-read-card";
const NO_COVER_LABEL = "No Cover";

/**
 * Builds class-name text for a card based on book status.
 * @param status - Book status value.
 * @returns Class-name text for card root element.
 */
function cardClassNameForStatus(status: Book["status"]): string {
    if (status === BOOK_STATUS_READ) {
        return `${CARD_CLASS} ${READ_CARD_CLASS}`;
    }
    return CARD_CLASS;
}

/**
 * Resolves estimated finish date shown as interactive card control.
 * @param book - Book model to inspect.
 * @param finishDateByBookId - Finish date lookup keyed by `book_id`.
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
    const FINISH_DATE = finishDateByBookId[book.book_id];
    if (!FINISH_DATE) {
        return null;
    }
    return FINISH_DATE;
}

/**
 * Creates the image element for a covered book.
 * @param cover - Cover image source.
 * @param title - Title used for alt text.
 * @returns Configured cover image element.
 */
function coverImageNode(cover: string, title: string): HTMLImageElement {
    const IMAGE = document.createElement("img");
    IMAGE.src = cover;
    IMAGE.alt = `Cover of ${title}`;
    IMAGE.loading = "lazy";
    IMAGE.dataset.fallbackCover = "1";
    return IMAGE;
}

/**
 * Creates the fallback element for books without a cover.
 * @returns Configured fallback cover element.
 */
function coverFallbackNode(): HTMLDivElement {
    const FALLBACK = document.createElement("div");
    FALLBACK.className = "cover-fallback";
    FALLBACK.textContent = NO_COVER_LABEL;
    return FALLBACK;
}

/**
 * Creates the base cover button shared by both cover states.
 * @param bookId - Book identifier assigned to the button dataset.
 * @returns Configured cover button shell.
 */
function coverButtonShell(bookId: string): HTMLButtonElement {
    const COVER_BUTTON = document.createElement("button");
    COVER_BUTTON.className = "book-cover-btn edit-book-btn";
    COVER_BUTTON.dataset.bookId = bookId;
    COVER_BUTTON.type = "button";
    return COVER_BUTTON;
}

/**
 * Appends cover-specific content into the shared cover button.
 * @param coverButton - Cover button receiving the rendered content.
 * @param book - Book model whose cover state is rendered.
 * @param title - Title used for image alt text.
 */
function appendCoverContent(
    coverButton: HTMLButtonElement,
    book: Book,
    title: string,
): void {
    const COVER = bookCoverSrc(book);
    if (!COVER) {
        coverButton.append(coverFallbackNode());
        return;
    }
    coverButton.classList.add("has-cover");
    coverButton.append(coverImageNode(COVER, title));
    if (book.status === BOOK_STATUS_READ) {
        bindReadCardHolo(coverButton);
    }
}

/**
 * Builds the cover button for one rendered book card.
 * @param book - Book object used to build the cover button.
 * @param title - Title of the book used for the image alt text.
 * @returns Button element containing the cover image or a fallback placeholder.
 */
export function coverButtonForBook(
    book: Book,
    title: string,
): HTMLButtonElement {
    const COVER_BUTTON = coverButtonShell(String(book.book_id || ""));
    appendCoverContent(COVER_BUTTON, book, title);
    return COVER_BUTTON;
}

/**
 * Creates the title heading for a book card.
 * @param title - Book title text.
 * @returns Configured title heading element.
 */
export function cardHeadingNode(title: string): HTMLHeadingElement {
    const HEADING = document.createElement("h1");
    HEADING.className = "book-title";
    HEADING.textContent = title;
    return HEADING;
}

/**
 * Creates the status pill for a book card.
 * @param status - Book status value.
 * @returns Configured status element.
 */
export function cardStatusNode(status: Book["status"]): HTMLSpanElement {
    const STATUS = document.createElement("span");
    STATUS.className = `book-status-pill is-${status}`;
    STATUS.textContent = statusLabel(status);
    return STATUS;
}

/**
 * Creates the subtitle element for a book card.
 * @param book - Book model used to build subtitle text.
 * @returns Configured subtitle element.
 */
export function cardSubtitleNode(book: Book): HTMLParagraphElement {
    const SUBTITLE = document.createElement("p");
    SUBTITLE.className = "book-subtitle";
    SUBTITLE.textContent = subtitle(book);
    return SUBTITLE;
}

/**
 * Creates the remove button for a book card.
 * @param bookId - Book identifier used by card actions.
 * @returns Configured remove button element.
 */
function removeBookButton(bookId: string): HTMLButtonElement {
    const REMOVE_BTN = document.createElement("button");
    REMOVE_BTN.className = "btn rm-btn remove-book-btn";
    REMOVE_BTN.type = "button";
    REMOVE_BTN.dataset.bookId = bookId;
    REMOVE_BTN.textContent = "Remove";
    return REMOVE_BTN;
}

/**
 * Creates the actions wrapper for a book card.
 * @param book - Book model whose actions are rendered.
 * @param bookId - Book identifier used by card actions.
 * @param context - Shared render context for finish-date navigation.
 * @returns Configured actions element.
 */
export function cardActionsNode(
    book: Book,
    bookId: string,
    context: CardRenderContext,
): HTMLDivElement {
    const ACTIONS = document.createElement("div");
    ACTIONS.className = "book-actions";
    const FINISH_DATE = estimatedFinishDate(book, context.finishDateByBookId);
    if (FINISH_DATE !== null) {
        ACTIONS.append(estimatedFinishButton(FINISH_DATE, context));
    }
    ACTIONS.append(removeBookButton(bookId));
    return ACTIONS;
}

/**
 * Creates the root card element for one book.
 * @param book - Book model to render.
 * @param bookId - Book identifier used in datasets.
 * @returns Configured card root element.
 */
export function cardRootNode(book: Book, bookId: string): HTMLElement {
    const CARD = document.createElement("article");
    CARD.className = cardClassNameForStatus(book.status);
    CARD.dataset.bookId = bookId;
    CARD.dataset.status = String(book.status);
    return CARD;
}
