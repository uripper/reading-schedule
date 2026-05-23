import type {
    Book,
    BookDialogSubmitPayload,
    BookSubmitPayload,
} from "../../types/types.ts";
import {
    applyBulkBookUpdates,
    isBulkBookSubmitPayload,
} from "./bulk-edit-updates.ts";
import { hydrateBookCover, upsertBookById } from "./save.ts";
import { applyScheduledDaysToShelfBooks } from "./save_scheduled_days.ts";

async function nextBooksAfterSingleSave(
    books: Book[],
    payload: BookSubmitPayload,
): Promise<Book[]> {
    const HYDRATED = await hydrateBookCover(payload.book);
    let nextBooks = upsertBookById(books, HYDRATED);
    if (payload.applyScheduledDaysToShelf) {
        nextBooks = applyScheduledDaysToShelfBooks(nextBooks, HYDRATED);
    }
    return nextBooks;
}

function nextBooksAfterBulkSave(
    books: Book[],
    payload: Extract<BookDialogSubmitPayload, { type: "bulk_books" }>,
): Book[] {
    return applyBulkBookUpdates(books, payload.bookIds, payload.updates);
}

export async function nextBooksAfterDialogSave(
    books: Book[],
    payload: BookDialogSubmitPayload,
): Promise<Book[]> {
    if (isBulkBookSubmitPayload(payload)) {
        return nextBooksAfterBulkSave(books, payload);
    }
    return await nextBooksAfterSingleSave(books, payload);
}
