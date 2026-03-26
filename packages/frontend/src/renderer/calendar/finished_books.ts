import type {
    BookFinishLookup,
    CompletedBookRow,
    ManualSessionBook,
} from "../../types/types.ts";

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

function finishedAtValue(book: BookFinishLookup): string {
    return String(book.finished_at ?? "").trim();
}

function isUniqueBookId(bookId: string, seenBookIds: Set<string>): boolean {
    if (bookId === "") {
        return false;
    }
    if (seenBookIds.has(bookId)) {
        return false;
    }
    seenBookIds.add(bookId);
    return true;
}

function appendRowByDate(
    rowsByDate: Record<string, CompletedBookRow[]>,
    finishedAt: string,
    row: CompletedBookRow,
): void {
    const ROWS_BY_DATE = rowsByDate;
    if (!(finishedAt in ROWS_BY_DATE)) {
        ROWS_BY_DATE[finishedAt] = [];
    }
    const EXISTING_ROWS = ROWS_BY_DATE[finishedAt];
    if (EXISTING_ROWS === undefined) {
        return;
    }
    EXISTING_ROWS.push(row);
}

function uniqueFinishedTitles(rows: CompletedBookRow[]): string[] {
    const SEEN_TITLES = new Set<string>();
    const TITLES: string[] = [];

    for (const ROW of rows) {
        const TITLE = ROW.title.trim();
        if (TITLE === "") {
            continue;
        }
        if (SEEN_TITLES.has(TITLE)) {
            continue;
        }
        SEEN_TITLES.add(TITLE);
        TITLES.push(TITLE);
    }
    return TITLES;
}

function completedBookRowForEntry(
    entry: ManualSessionBook,
    getBookById: (bookId: string) => BookFinishLookup | null,
    seenBookIds: Set<string>,
): { finishedAt: string; row: CompletedBookRow } | null {
    const BOOK_ID = entry.bookId.trim();
    if (!isUniqueBookId(BOOK_ID, seenBookIds)) {
        return null;
    }
    const BOOK = getBookById(BOOK_ID);
    if (BOOK === null) {
        return null;
    }
    const FINISHED_AT = finishedAtValue(BOOK);
    if (FINISHED_AT === "") {
        return null;
    }
    return {
        finishedAt: FINISHED_AT,
        row: {
            book_id: BOOK_ID,
            date: FINISHED_AT,
            finish: true,
            minutes: 0,
            title: completedBookTitle(BOOK.title, entry.title),
        },
    };
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
        const ROW_DATA = completedBookRowForEntry(
            ENTRY,
            getBookById,
            SEEN_BOOK_IDS,
        );
        if (ROW_DATA === null) {
            continue;
        }
        appendRowByDate(ROWS_BY_DATE, ROW_DATA.finishedAt, ROW_DATA.row);
    }
    return ROWS_BY_DATE;
}

/**
 * Builds summary text for finished books on a selected day.
 * @param rows - Completed-book rows for a day.
 * @returns Summary text or empty string when no titles exist.
 */
export function finishedBooksSummaryText(rows: CompletedBookRow[]): string {
    const FINISHED_TITLES = uniqueFinishedTitles(rows);
    if (FINISHED_TITLES.length === 0) {
        return "";
    }
    return `Finished: ${FINISHED_TITLES.join(", ")}`;
}
