import type { Book } from "../../types/types.js";
import { getPlannerApi } from "../app/planner_api.js";

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
        const LOCAL_COVER = await getPlannerApi().downloadCover(
            book.cover_url,
            book.book_id,
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
