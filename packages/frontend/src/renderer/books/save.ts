/** Hydrates book covers and preserves progress ordering across dialog saves. */
import type { Book } from "../../types/types.ts";
import { getPlannerApi } from "../app/planner_api.ts";
import {
    coverUploadDataUrl,
    stagedCoverUpload,
} from "./cover-upload-staging.ts";
import {
    withInitialProgressHistory,
    withProgressHistory,
} from "./progress-history.ts";

/** Processes a captured cover source after the book has been saved. */
export async function hydrateBookCover(book: Book): Promise<Book> {
    const UPLOAD = stagedCoverUpload(book.cover_local_path);
    let localCover = "";
    if (UPLOAD !== undefined) {
        const DATA_URL = await coverUploadDataUrl(UPLOAD);
        localCover = await getPlannerApi().saveUploadedCover(
            DATA_URL,
            book.book_id,
        );
    } else if (book.cover_url && !book.cover_local_path) {
        localCover = await getPlannerApi().downloadCover(
            book.cover_url,
            book.book_id,
        );
    } else {
        return book;
    }
    if (!localCover) {
        throw new Error(
            "No cover image was returned. Select the cover again to retry.",
        );
    }
    return { ...book, cover_local_path: localCover };
}

/** Keeps renderer-only blob URLs out of persisted book snapshots. */
export function bookWithoutTransientCover(book: Book): Book {
    if (stagedCoverUpload(book.cover_local_path) === undefined) {
        return book;
    }
    return { ...book, cover_local_path: "" };
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
        return [...books, withInitialProgressHistory(nextBook)];
    }
    const NEXT_BOOKS = [...books];
    const CURRENT = books[INDEX];
    if (CURRENT !== undefined) {
        NEXT_BOOKS[INDEX] = withProgressHistory(CURRENT, nextBook);
    }
    return NEXT_BOOKS;
}
