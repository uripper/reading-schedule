/** Applies shared library edits while preserving source history and progress timestamps. */
import type {
    Book,
    BookDialogSubmitPayload,
    BookInput,
    BulkBookSubmitPayload,
    CollectionChanges,
} from "../../types/types.ts";
import { withCollectionChanges } from "./collection_bulk.ts";
import { normalizeBook } from "./model-normalize.ts";
import { withProgressHistory } from "./progress-history.ts";
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

/**
 * Adds a book's own collections, after mass-edit changes, to its updates.
 * @param book - Book being edited.
 * @param updates - Shared field updates.
 * @param changes - Collections added and removed for every selected book.
 * @returns Updates for this book.
 */
function bookBulkUpdates(
    book: Book,
    updates: BookInput,
    changes: CollectionChanges | undefined,
): BookInput {
    const EDITABLE_UPDATES = protectedBulkUpdates(updates);
    if (changes === undefined) {
        return EDITABLE_UPDATES;
    }
    return {
        ...EDITABLE_UPDATES,
        collections: withCollectionChanges(book.collections, changes),
    };
}

function mergedBulkBook(
    book: Book,
    updates: BookInput,
    changes: CollectionChanges | undefined,
): Book {
    const BOOK_ID = normalizedBookId(book);
    let nextBook: BookInput = {
        ...book,
        ...bookBulkUpdates(book, updates, changes),
    };
    if (updates.status === BOOK_STATUS_READ) {
        nextBook = { ...nextBook, ...completedProgressFields(nextBook) };
    }
    return withProgressHistory(
        book,
        normalizeBook(protectSelfBlocker(BOOK_ID, nextBook)),
    );
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
    return "type" in payload;
}

/**
 * Applies a mass edit: shared field updates plus per-book collection changes.
 * @param books - Library books.
 * @param payload - Selected book ids, field updates, and collection changes.
 * @returns Books with the selected ones updated.
 */
export function applyBulkBookSave(
    books: Book[],
    payload: Omit<BulkBookSubmitPayload, "type">,
): Book[] {
    const CHANGES = payload.collectionChanges;
    if (!hasBulkUpdates(payload.updates) && CHANGES === undefined) {
        return books;
    }
    const SELECTED_IDS = new Set(payload.bookIds);
    return books.map((book) => {
        if (!SELECTED_IDS.has(normalizedBookId(book))) {
            return book;
        }
        return mergedBulkBook(book, payload.updates, CHANGES);
    });
}

/**
 * Applies shared field updates to the selected books.
 * @param books - Library books.
 * @param bookIds - Selected book ids.
 * @param updates - Field updates for every selected book.
 * @returns Books with the selected ones updated.
 */
export function applyBulkBookUpdates(
    books: Book[],
    bookIds: string[],
    updates: BookInput,
): Book[] {
    return applyBulkBookSave(books, { bookIds, updates });
}
