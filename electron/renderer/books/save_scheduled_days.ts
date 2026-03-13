import type { Book } from "../../types/types.ts";
import { normalizeScheduledDays } from "./scheduled_days.ts";
import { normalizeShelfName } from "./shelf.ts";

/**
 * Propagates one book's scheduled days to all books on the same shelf.
 * @param books - Current in-memory books collection.
 * @param sourceBook - Book whose scheduled days should be used as the source.
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
