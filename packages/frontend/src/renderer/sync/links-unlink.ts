/** Removes one source link durably without touching the book, its history, or other links. */
import type {
    Book,
    SyncImportStore,
    SyncRecord,
} from "@reading-schedule/contracts";
import { confirmAction } from "../confirm/action-confirm.ts";
import { syncSourceLabel, withoutSyncLink } from "./links.ts";
import { syncRecordName } from "./review-conflicts.ts";

/** Drops the field instead of persisting an empty list. */
function withLinks(book: Book, links: SyncRecord[]): Book {
    const NEXT: Book = { ...book, sync_links: links };
    if (links.length === 0) {
        delete NEXT.sync_links;
    }
    return NEXT;
}

/** Returns the library with one link removed from one book. */
export function unlinkedBooks(
    books: readonly Book[],
    bookId: string,
    link: SyncRecord,
): Book[] {
    return books.map((book) => {
        if (book.book_id !== bookId) {
            return book;
        }
        return withLinks(book, withoutSyncLink(book.sync_links, link));
    });
}

/** Explains that unlinking is not the same as ignoring the source book. */
export async function confirmSyncUnlink(link: SyncRecord): Promise<boolean> {
    return await confirmAction({
        confirmLabel: "Unlink",
        message: `Unlink “${syncRecordName(link)}” from ${syncSourceLabel(link)}?`,
        title: "Unlink synced source?",
        warning:
            "Bartleby keeps this book, its reading history, and other links. The source book can be matched again in a later sync review.",
    });
}

/** Restores only the edited book, and only if nothing changed it during the save. */
function rollbackUnlink(
    store: SyncImportStore,
    previous: Book,
    staged: Book | undefined,
): void {
    store.replaceBooks(
        store.getBooks().map((book) => {
            if (book.book_id !== previous.book_id || book !== staged) {
                return book;
            }
            return previous;
        }),
    );
    store.changed();
}

/** Flushes pending edits, saves the removal, and restores the link if saving fails. */
export async function unlinkSyncSource(
    store: SyncImportStore,
    bookId: string,
    link: SyncRecord,
): Promise<void> {
    if (!(await store.flush())) {
        throw new Error("Could not save current changes. Retry unlinking.");
    }
    const PREVIOUS = store.getBooks().find((book) => book.book_id === bookId);
    if (PREVIOUS === undefined) {
        throw new Error("This book is no longer in the library.");
    }
    const STAGED = unlinkedBooks(store.getBooks(), bookId, link);
    store.replaceBooks(STAGED);
    if (!(await store.save())) {
        rollbackUnlink(
            store,
            PREVIOUS,
            STAGED.find((book) => book.book_id === bookId),
        );
        throw new Error(
            "Could not save the unlink. The link was restored; retry.",
        );
    }
    store.changed();
}
