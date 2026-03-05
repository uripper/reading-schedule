import type {
    BookFinishLookup,
    CompletedBookRow,
    ManualSessionBook,
} from "../../types/types.js";

/**
 * Resolves title text for completed-book row display.
 * @param bookTitle - Canonical book title from model.
 * @param fallbackTitle - Fallback title from session-book lookup.
 * @returns Non-empty title text.
 */
function completedBookTitle(bookTitle: string, fallbackTitle: string): string {
    const NORMALIZED_BOOK_TITLE = bookTitle.trim();
    if (NORMALIZED_BOOK_TITLE !== "") {
        return NORMALIZED_BOOK_TITLE;
    }
    const NORMALIZED_FALLBACK_TITLE = fallbackTitle.trim();
    if (NORMALIZED_FALLBACK_TITLE !== "") {
        return NORMALIZED_FALLBACK_TITLE;
    }
    return "Untitled";
}

/**
 * Builds completed-book rows grouped by finished date.
 * @param sessionBooks - Session-book options from calendar handlers.
 * @param getBookById - Book resolver callback by id.
 * @returns Map of date keys to completed-book rows.
 */
export function buildCompletedBookRowsByDate(
    sessionBooks: ManualSessionBook[],
    getBookById: (bookId: string) => BookFinishLookup | null,
): Record<string, CompletedBookRow[]> {
    const ROWS_BY_DATE: Record<string, CompletedBookRow[]> = {};
    const SEEN_BOOK_IDS = new Set<string>();

    for (const ENTRY of sessionBooks) {
        const BOOK_ID = ENTRY.bookId.trim();
        if (BOOK_ID === "") {
            continue;
        }
        if (SEEN_BOOK_IDS.has(BOOK_ID)) {
            continue;
        }
        SEEN_BOOK_IDS.add(BOOK_ID);
        const BOOK = getBookById(BOOK_ID);
        if (BOOK === null) {
            continue;
        }
        const FINISHED_AT = String(BOOK.finished_at ?? "").trim();
        if (FINISHED_AT === "") {
            continue;
        }
        if (!(FINISHED_AT in ROWS_BY_DATE)) {
            ROWS_BY_DATE[FINISHED_AT] = [];
        }
        ROWS_BY_DATE[FINISHED_AT].push({
            book_id: BOOK_ID,
            date: FINISHED_AT,
            finish: true,
            minutes: 0,
            title: completedBookTitle(BOOK.title, ENTRY.title),
        });
    }
    return ROWS_BY_DATE;
}

/**
 * Builds summary text for finished books on a selected day.
 * @param rows - Completed-book rows for a day.
 * @returns Summary text or empty string when no titles exist.
 */
export function finishedBooksSummaryText(rows: CompletedBookRow[]): string {
    const SEEN_TITLES = new Set<string>();
    const FINISHED_TITLES: string[] = [];

    for (const ROW of rows) {
        const TITLE = ROW.title.trim();
        if (TITLE === "") {
            continue;
        }
        if (SEEN_TITLES.has(TITLE)) {
            continue;
        }
        SEEN_TITLES.add(TITLE);
        FINISHED_TITLES.push(TITLE);
    }
    if (FINISHED_TITLES.length === 0) {
        return "";
    }
    return `Finished: ${FINISHED_TITLES.join(", ")}`;
}
