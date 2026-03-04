import type { Book } from "../../types/types.js";
import { normalizeScheduledDays } from "./scheduled_days.js";
import { normalizeShelfName } from "./shelf.js";

/**
 * Propagates one book's scheduled days to all books on the same shelf.
 * @param books Current in-memory books collection.
 * @param sourceBook Book whose scheduled days should be used as the source.
 * @returns Updated books collection with same-shelf scheduled days aligned.
 */
export function applyScheduledDaysToShelfBooks(
    books: Book[],
    sourceBook: Book,
): Book[] {
    const SHELF = normalizeShelfName(sourceBook.shelf);
    if (SHELF === "") {
        return books;
    }
    const NEXT_DAYS = normalizeScheduledDays(sourceBook.scheduled_days);
    return books.map((book) => {
        if (normalizeShelfName(book.shelf) !== SHELF) {
            return book;
        }
        return {
            ...book,
            scheduled_days: [...NEXT_DAYS],
        };
    });
}
