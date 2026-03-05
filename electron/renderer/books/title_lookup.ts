import type { Book } from "../../types/types.js";

/**
 * Builds a map of book id to title, preferring full-catalog input when present.
 * @param books - Current filtered/rendered books.
 * @param allBooks - Full catalog books.
 * @returns Book id to title map.
 */
export function titleByIdMap(
    books: Book[],
    allBooks: Book[],
): Record<string, string> {
    let sourceBooks = books;
    if (allBooks.length) {
        sourceBooks = allBooks;
    }
    return Object.fromEntries(
        sourceBooks.map((book) => [book.book_id, book.title]),
    );
}
