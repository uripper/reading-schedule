import type {
    Book,
    BookDialogSubmitPayload,
    BookInput,
    BulkBookSubmitPayload,
} from "../../types/types.ts";
import { normalizeBook } from "./model-normalize.ts";
import { BOOK_STATUS_READ } from "./status_catalog.ts";

const COMPLETE_PROGRESS_PERCENT = 100;

function normalizedBookId(book: Pick<Book, "book_id">): string {
    return String(book.book_id || "");
}

function readStatusPages(book: BookInput): number | null {
    const TOTAL = book.pages_total;
    if (typeof TOTAL === "number" && TOTAL > 0) {
        return TOTAL;
    }
    return null;
}

function completedProgressFields(book: BookInput): Partial<Book> {
    const TOTAL_PAGES = readStatusPages(book);
    if (TOTAL_PAGES === null) {
        return { progress_percent: COMPLETE_PROGRESS_PERCENT };
    }
    return {
        pages_read: TOTAL_PAGES,
        progress_percent: COMPLETE_PROGRESS_PERCENT,
    };
}

function protectSelfBlocker(bookId: string, book: BookInput): BookInput {
    if (String(book.blocked_by ?? "") !== bookId) {
        return book;
    }
    return { ...book, blocked_by: null };
}

function mergedBulkBook(book: Book, updates: BookInput): Book {
    const BOOK_ID = normalizedBookId(book);
    let nextBook: BookInput = { ...book, ...protectedBulkUpdates(updates) };
    if (updates.status === BOOK_STATUS_READ) {
        nextBook = { ...nextBook, ...completedProgressFields(nextBook) };
    }
    return normalizeBook(protectSelfBlocker(BOOK_ID, nextBook));
}

function protectedBulkUpdates(updates: BookInput): BookInput {
    const EDITABLE_UPDATES = { ...updates };
    delete EDITABLE_UPDATES.cover_local_path;
    delete EDITABLE_UPDATES.cover_url;
    delete EDITABLE_UPDATES.lookup_note;
    delete EDITABLE_UPDATES.title;
    return EDITABLE_UPDATES;
}

function hasBulkUpdates(updates: BookInput): boolean {
    return Object.keys(updates).length > 0;
}

export function isBulkBookSubmitPayload(
    payload: BookDialogSubmitPayload,
): payload is BulkBookSubmitPayload {
    return "type" in payload && payload.type === "bulk_books";
}

export function applyBulkBookUpdates(
    books: Book[],
    bookIds: string[],
    updates: BookInput,
): Book[] {
    if (!hasBulkUpdates(updates)) {
        return books;
    }
    const SELECTED_IDS = new Set(bookIds);
    return books.map((book) => {
        if (!SELECTED_IDS.has(normalizedBookId(book))) {
            return book;
        }
        return mergedBulkBook(book, updates);
    });
}
