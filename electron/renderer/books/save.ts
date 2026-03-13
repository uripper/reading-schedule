import type { Book } from "../../types/types.js";
import { getPlannerApi } from "../app/planner_api.js";

const COVER_DOWNLOAD_TIMEOUT_MS = 4_000;
const COVER_DOWNLOAD_TIMEOUT_MESSAGE = "Timed out downloading the book cover.";

/**
 * Resolves a promise within a bounded time window.
 * @param operation - Promise to await.
 * @param timeoutMs - Maximum wait time in milliseconds.
 * @returns Resolved operation value when it finishes in time.
 */
async function promiseWithTimeout<T>(
    operation: Promise<T>,
    timeoutMs: number,
): Promise<T> {
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;
    const TIMEOUT_PROMISE = new Promise<never>((_resolve, reject) => {
        timeoutId = globalThis.setTimeout(() => {
            reject(new Error(COVER_DOWNLOAD_TIMEOUT_MESSAGE));
        }, timeoutMs);
    });

    try {
        return await Promise.race([operation, TIMEOUT_PROMISE]);
    } finally {
        if (timeoutId !== null) {
            globalThis.clearTimeout(timeoutId);
        }
    }
}

/**
 * Downloads remote cover art for a book when no local cover exists yet.
 * @param book - Source book model.
 * @returns Original book or cloned book with `cover_local_path` populated.
 */
export async function hydrateBookCover(book: Book): Promise<Book> {
    if (!book.cover_url || book.cover_local_path) {
        return book;
    }

    try {
        const LOCAL_COVER = await promiseWithTimeout(
            getPlannerApi().downloadCover(book.cover_url, book.book_id),
            COVER_DOWNLOAD_TIMEOUT_MS,
        );
        if (LOCAL_COVER) {
            return { ...book, cover_local_path: LOCAL_COVER };
        }
        return book;
    } catch {
        return book;
    }
}

/**
 * Inserts or replaces a book in collection by `book_id`.
 * @param books - Existing books collection.
 * @param nextBook - Book to insert or replace.
 * @returns New books array with upsert applied.
 */
export function upsertBookById(books: Book[], nextBook: Book): Book[] {
    const INDEX = books.findIndex((row) => row.book_id === nextBook.book_id);
    if (INDEX < 0) {
        return [...books, nextBook];
    }
    const NEXT_BOOKS = [...books];
    NEXT_BOOKS[INDEX] = nextBook;
    return NEXT_BOOKS;
}
