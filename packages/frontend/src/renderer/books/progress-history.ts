/** Keeps progress timestamps and sync source links through edits and serialization. */
import type { Book, BookInput } from "@reading-schedule/contracts";
import { normalizedSyncLinks } from "../sync/links.ts";

/** Retains validated optional history, migrating legacy Kobo records to source links. */
export function progressHistory(book: BookInput): Partial<Book> {
    const RESULT: Partial<Book> = {};
    const LINKS = normalizedSyncLinks(book);
    if (LINKS.length > 0) {
        RESULT.sync_links = LINKS;
    }
    if (typeof book.progress_updated_at === "string") {
        RESULT.progress_updated_at = book.progress_updated_at;
    }
    return RESULT;
}

/** Stamps real progress edits and preserves source history during metadata-only edits. */
export function withProgressHistory(current: Book, next: Book): Book {
    const HISTORY = progressHistory(current);
    if (
        current.progress_percent !== next.progress_percent ||
        current.pages_read !== next.pages_read
    ) {
        HISTORY.progress_updated_at = new Date().toISOString();
    }
    return { ...next, ...HISTORY };
}

/** Dates progress entered when a new book is created, without retroactively dating legacy books. */
export function withInitialProgressHistory(book: Book): Book {
    if (book.progress_percent > 0 || (book.pages_read ?? 0) > 0) {
        return { ...book, progress_updated_at: new Date().toISOString() };
    }
    return book;
}
