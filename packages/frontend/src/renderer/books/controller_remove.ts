/** Removes a book after the user confirms, re-linking books that waited on it. */
import type { RemoveBookDeps } from "../../types/types.ts";
import { booksAfterRemovingBook } from "./blocker-lineage.ts";
import { confirmRemoveBook } from "./remove-confirm.ts";

/**
 * Asks for confirmation, then removes the book from the library.
 * @param deps - Library lookups and the commit callback.
 * @param bookId - Book to remove.
 * @returns `true` when the book was removed.
 */
export async function removeBookAfterConfirm(
    deps: RemoveBookDeps,
    bookId: string,
): Promise<boolean> {
    const BOOK = deps.findBook(bookId);
    if (BOOK === null) {
        return false;
    }
    if (!(await confirmRemoveBook(BOOK))) {
        return false;
    }
    const BOOKS = deps.getBooks();
    const NEXT_BOOKS = booksAfterRemovingBook(BOOKS, bookId);
    if (NEXT_BOOKS.length === BOOKS.length) {
        return false;
    }
    deps.onRemoved(NEXT_BOOKS);
    return true;
}
