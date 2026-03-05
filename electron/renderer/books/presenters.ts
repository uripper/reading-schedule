import type { BlockerMeta, Book, BookMetaOptions } from "../../types/types.js";
import { WORDS_PER_PAGE } from "./constants.js";
import { shelfLabelForBook } from "./shelf.js";
import { BOOK_STATUS_READ } from "./status_catalog.js";
import { formatInt } from "./utils.js";

/**
 * Checks whether an optional numeric value is a positive finite number.
 * @param value - Numeric value that may be nullish.
 * @returns `true` when value exists and is greater than zero.
 */
function hasPositiveNumber(value: number | null | undefined): boolean {
    if (value === null || value === undefined) {
        return false;
    }
    return value > 0;
}

/**
 * Builds status-sensitive finish metadata text for one book.
 * @param book - Book to describe.
 * @param finishDateByBookId - Finish date lookup keyed by `book_id`.
 * @returns Metadata text or `null` when no finish text should be shown.
 */
function finishMetaPart(
    book: Book,
    finishDateByBookId: Record<string, string>,
): string | null {
    const FINISH_DATE = finishDateByBookId[book.book_id];
    if (!FINISH_DATE) {
        return null;
    }
    if (book.status === BOOK_STATUS_READ) {
        return `Finished ${FINISH_DATE}`;
    }
    return null;
}

/**
 * Builds blocker metadata text with title resolution when available.
 * @param book - Book to describe.
 * @param titleById - Book-title lookup keyed by `book_id`.
 * @returns Blocker metadata or `null` when no blocker is set.
 */
export function blockerMeta(
    book: Book,
    titleById: Record<string, string>,
): BlockerMeta | null {
    const BLOCKER_BOOK_ID = String(book.blocked_by ?? "").trim();
    if (BLOCKER_BOOK_ID === "") {
        return null;
    }
    const RESOLVED_BLOCKER = titleById[BLOCKER_BOOK_ID];
    let blockerLabel = BLOCKER_BOOK_ID;
    if (typeof RESOLVED_BLOCKER === "string" && RESOLVED_BLOCKER !== "") {
        blockerLabel = RESOLVED_BLOCKER;
    }
    return {
        blockerBookId: BLOCKER_BOOK_ID,
        label: `After: ${blockerLabel}`,
    };
}

/**
 * Builds blocker metadata text with title resolution when available.
 * @param book - Book to describe.
 * @param titleById - Book-title lookup keyed by `book_id`.
 * @returns Metadata text or `null` when no blocker is set.
 */
function blockerMetaPart(
    book: Book,
    titleById: Record<string, string>,
): string | null {
    const BLOCKER = blockerMeta(book, titleById);
    if (BLOCKER === null) {
        return null;
    }
    return BLOCKER.label;
}

/**
 * Builds the progress line shown in each book card.
 * @param book - Book to present.
 * @returns Human-readable progress summary with percent and pages.
 */
export function progressLabel(book: Book): string {
    const PCT = Number(book.progress_percent);
    const PAGES_READ = Math.max(0, Number(book.pages_read ?? 0));
    if (hasPositiveNumber(book.pages_total)) {
        const PAGES_TOTAL = Math.max(0, Number(book.pages_total ?? 0));
        return `${PCT.toFixed(1)}% · ${formatInt(PAGES_READ)}/${formatInt(PAGES_TOTAL)} pages`;
    }
    return `${PCT.toFixed(1)}% · ${formatInt(PAGES_READ)} pages read`;
}

/**
 * Builds word-count summary text for each book card.
 * @param book - Book to present.
 * @returns Word total label or page-based estimate fallback.
 */
export function wordsLabel(book: Book): string {
    const WORDS_TOTAL = book.words_total;
    if (hasPositiveNumber(WORDS_TOTAL)) {
        return `${formatInt(WORDS_TOTAL)} words`;
    }
    const PAGES_TOTAL = book.pages_total;
    if (hasPositiveNumber(PAGES_TOTAL)) {
        return `${formatInt(Number(PAGES_TOTAL) * WORDS_PER_PAGE)} word estimate`;
    }
    return "No word estimate";
}

/**
 * Builds metadata line including status, completion date, due date, and blockers.
 * @param book - Book to present.
 * @param options - Optional context used to resolve titles and finish dates.
 * @returns Joined metadata text for card subtitle line.
 */
export function metaLabel(book: Book, options: BookMetaOptions = {}): string {
    const TITLE_BY_ID = options.titleById ?? {};
    const FINISH_DATE_BY_BOOK_ID = options.finishDateByBookId ?? {};
    const BITS: string[] = [];

    const FINISH_PART = finishMetaPart(book, FINISH_DATE_BY_BOOK_ID);
    if (FINISH_PART !== null) {
        BITS.push(FINISH_PART);
    }
    if (book.deadline !== null && book.deadline !== "") {
        BITS.push(`Due: ${book.deadline}`);
    }
    if (options.showBlockerMeta !== false) {
        const BLOCKER_PART = blockerMetaPart(book, TITLE_BY_ID);
        if (BLOCKER_PART !== null) {
            BITS.push(BLOCKER_PART);
        }
    }
    if (options.showShelfMeta === true) {
        BITS.push(`Shelf: ${shelfLabelForBook(book)}`);
    }
    return BITS.join("\n");
}

/**
 * Builds secondary subtitle text for a book card.
 * @param book - Book to present.
 * @returns Author text, lookup note, or fallback label.
 */
export function subtitle(book: Book): string {
    if (book.author !== "") {
        return book.author;
    }
    if (book.lookup_note !== "") {
        return book.lookup_note;
    }
    return "No author metadata";
}
