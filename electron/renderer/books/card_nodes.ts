import type { Book, CardRenderContext } from "../../types/types.js";
import { bindReadCardHolo } from "./card_holo.js";
import {
    afterBookLinkButton,
    estimatedFinishButton,
} from "./card_navigation_buttons.js";
import { scrollToBookCard } from "./card_scroll_target.js";
import { bookCoverSrc } from "./model.js";
import {
    blockerMeta,
    metaLabel,
    progressLabel,
    subtitle,
    wordsLabel,
} from "./presenters.js";
import {
    BOOK_STATUS_IN_PROGRESS,
    BOOK_STATUS_READ,
    BOOK_STATUS_TO_READ,
    statusLabel,
} from "./status_catalog.js";

const CARD_CLASS = "book-card";
const READ_CARD_CLASS = "is-read-card";
const PRE_LINE_WHITESPACE = "pre-line";

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
 * Builds the stats section for one book card.
 * @param book - Book model used for progress/meta labels.
 * @param context - Shared render context for metadata options and lookups.
 * @returns Configured stats wrapper element.
 */
function cardStatsNode(book: Book, context: CardRenderContext): HTMLDivElement {
    const STATS = document.createElement("div");
    STATS.className = "book-stats";
    const BASE_META_TEXT = metaLabel(book, {
        finishDateByBookId: context.finishDateByBookId,
        showBlockerMeta: false,
        showShelfMeta: context.showShelfMeta,
        titleById: context.titleById,
    });
    let blocker: ReturnType<typeof blockerMeta> = null;
    if (context.showBlockerMeta) {
        blocker = blockerMeta(book, context.titleById);
    }
    const STAT_LINES: Array<{ text: string; preserveLineBreaks: boolean }> = [
        { preserveLineBreaks: false, text: progressLabel(book) },
    ];
    if (context.showWordCount) {
        STAT_LINES.push({ preserveLineBreaks: false, text: wordsLabel(book) });
    }
    if (BASE_META_TEXT !== "") {
        STAT_LINES.push({ preserveLineBreaks: true, text: BASE_META_TEXT });
    }
    for (const LINE of STAT_LINES) {
        const SPAN = document.createElement("span");
        SPAN.textContent = LINE.text;
        if (LINE.preserveLineBreaks) {
            SPAN.style.whiteSpace = PRE_LINE_WHITESPACE;
        }
        STATS.append(SPAN);
    }
    if (blocker !== null) {
        STATS.append(
            afterBookLinkButton(
                blocker.label,
                blocker.blockerBookId,
                scrollToBookCard,
            ),
        );
    }
    return STATS;
}

/**
 * Create a button element representing a book cover (uses the book's cover image if available, otherwise shows a fallback).
 * @example
 * coverButtonForBook(sampleBook, "Example Title")
 * <button class="book-cover-btn edit-book-btn" data-book-id="123">...</button>
 * @param {Book} book - Book object used to build the cover button.
 * @param {string} title - Title of the book used for the image alt text.
 * @returns {HTMLButtonElement} Button element containing the cover image or a fallback placeholder.
 */
function coverButtonForBook(book: Book, title: string): HTMLButtonElement {
    const COVER_BUTTON = document.createElement("button");
    COVER_BUTTON.className = "book-cover-btn edit-book-btn";
    COVER_BUTTON.dataset.bookId = String(book.book_id || "");
    COVER_BUTTON.type = "button";
    const COVER = bookCoverSrc(book);
    if (COVER) {
        COVER_BUTTON.classList.add("has-cover");
        const IMAGE = document.createElement("img");
        IMAGE.src = COVER;
        IMAGE.alt = `Cover of ${title}`;
        IMAGE.loading = "lazy";
        IMAGE.dataset.fallbackCover = "1";
        COVER_BUTTON.append(IMAGE);
        if (book.status === BOOK_STATUS_READ) {
            bindReadCardHolo(COVER_BUTTON);
        }
        return COVER_BUTTON;
    }
    const FALLBACK = document.createElement("div");
    FALLBACK.className = "cover-fallback";
    FALLBACK.textContent = "No Cover";
    COVER_BUTTON.append(FALLBACK);
    return COVER_BUTTON;
}
/**
 * Creates a full book card node including cover, metadata, and actions.
 * @param book - Book model to render.
 * @param context - Shared render context for cross-book metadata.
 * @returns Rendered book card element.
 */
export function createCardNode(
    book: Book,
    context: CardRenderContext,
): HTMLElement {
    const BOOK_ID = String(book.book_id || "");
    const TITLE = String(book.title || "Untitled");
    const CARD = document.createElement("article");
    CARD.className = cardClassNameForStatus(book.status);
    CARD.dataset.bookId = BOOK_ID;
    CARD.dataset.status = String(book.status);
    const COVER_BUTTON = coverButtonForBook(book, TITLE);
    const META = document.createElement("div");
    META.className = "book-meta";
    const HEADING = document.createElement("h1");
    HEADING.className = "book-title";
    HEADING.textContent = TITLE;
    const STATUS = document.createElement("span");
    STATUS.className = `book-status-pill is-${book.status}`;
    STATUS.textContent = statusLabel(book.status);
    const FINISH_DATE = estimatedFinishDate(book, context.finishDateByBookId);
    const SUB = document.createElement("p");
    SUB.className = "book-subtitle";
    SUB.textContent = subtitle(book);
    const STATS = cardStatsNode(book, context);
    const ACTIONS = document.createElement("div");
    ACTIONS.className = "book-actions";
    if (FINISH_DATE !== null) {
        ACTIONS.append(estimatedFinishButton(FINISH_DATE, context));
    }
    const REMOVE_BTN = document.createElement("button");
    REMOVE_BTN.className = "btn rm-btn remove-book-btn";
    REMOVE_BTN.type = "button";
    REMOVE_BTN.dataset.bookId = BOOK_ID;
    REMOVE_BTN.textContent = "Remove";
    ACTIONS.append(REMOVE_BTN);
    META.append(HEADING, SUB, STATUS, STATS, ACTIONS);
    CARD.append(COVER_BUTTON, META);
    return CARD;
}
