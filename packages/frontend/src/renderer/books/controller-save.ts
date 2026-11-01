/** Applies dialog edits immediately without waiting for cover processing. */
import type {
    Book,
    BookDialogSubmitPayload,
    BookSubmitPayload,
} from "../../types/types.ts";
import {
    applyBulkBookUpdates,
    isBulkBookSubmitPayload,
} from "./bulk-edit-updates.ts";
import { bookWithoutTransientCover, upsertBookById } from "./save.ts";
import { applyScheduledDaysToShelfBooks } from "./save_scheduled_days.ts";

/** Builds a metadata-only single-book update and optional shelf-day propagation. */
function nextBooksAfterSingleSave(
    books: Book[],
    payload: BookSubmitPayload,
): Book[] {
    const SAVED_BOOK = bookWithoutTransientCover(payload.book);
    let nextBooks = upsertBookById(books, SAVED_BOOK);
    if (payload.applyScheduledDaysToShelf) {
        nextBooks = applyScheduledDaysToShelfBooks(nextBooks, SAVED_BOOK);
    }
    return nextBooks;
}

/** Keeps bulk edits scoped to the selected books without scheduling image work. */
function nextBooksAfterBulkSave(
    books: Book[],
    payload: Extract<BookDialogSubmitPayload, { type: "bulk_books" }>,
): Book[] {
    return applyBulkBookUpdates(books, payload.bookIds, payload.updates);
}

/** Computes the saved library snapshot without image work. */
export function nextBooksAfterDialogSave(
    books: Book[],
    payload: BookDialogSubmitPayload,
): Book[] {
    if (isBulkBookSubmitPayload(payload)) {
        return nextBooksAfterBulkSave(books, payload);
    }
    return nextBooksAfterSingleSave(books, payload);
}
