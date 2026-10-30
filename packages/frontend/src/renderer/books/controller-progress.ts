/** Applies progress changes with consistent status, finish date, and source history. */
import type {
    Book,
    BookProgressUpdates,
    UpdateBookProgressOptions,
} from "../../types/types.ts";
import { withSyncLink } from "../sync/links.ts";
import { normalizeBook } from "./model-normalize.ts";
import { withUpdatedProgress } from "./progress.ts";
import { withProgressHistory } from "./progress-history.ts";
import {
    BOOK_STATUS_IN_PROGRESS,
    BOOK_STATUS_READ,
    BOOK_STATUS_TO_READ,
} from "./status_catalog.ts";

function normalizedCompletedAt(value: string | undefined): string | null {
    const TEXT = String(value ?? "").trim();
    if (TEXT === "") {
        return null;
    }
    return TEXT;
}

function todayDateKey(): string {
    return new Date().toISOString().slice(0, 10);
}

function withStartedStatus(book: Book, markStarted: boolean): Book {
    if (!markStarted || book.status !== BOOK_STATUS_TO_READ) {
        return book;
    }
    return {
        ...book,
        status: BOOK_STATUS_IN_PROGRESS,
    };
}

function resolvedFinishedAt(options: {
    completedAt: string | undefined;
    currentBook: Book;
    nextBook: Book;
}): string | null {
    if (options.nextBook.status !== BOOK_STATUS_READ) {
        return null;
    }
    const EXISTING = normalizedCompletedAt(
        options.nextBook.finished_at ?? undefined,
    );
    if (EXISTING !== null) {
        return EXISTING;
    }
    const PROVIDED = normalizedCompletedAt(options.completedAt);
    if (PROVIDED !== null) {
        return PROVIDED;
    }
    if (options.currentBook.status !== BOOK_STATUS_READ) {
        return todayDateKey();
    }
    return null;
}

export function updatedProgressBook(
    currentBook: Book,
    updates: BookProgressUpdates,
    options: UpdateBookProgressOptions,
): Book {
    const STARTED_BOOK = withStartedStatus(
        withUpdatedProgress(currentBook, updates),
        options.markStarted === true,
    );
    const NORMALIZED = withProgressHistory(
        currentBook,
        normalizeBook(STARTED_BOOK),
    );
    return {
        ...NORMALIZED,
        ...importedHistory(currentBook, options),
        finished_at: resolvedFinishedAt({
            completedAt: options.completedAt,
            currentBook,
            nextBook: NORMALIZED,
        }),
    };
}

/** Uses source time for imports so later synced reading can be compared correctly. */
function importedHistory(
    currentBook: Book,
    options: UpdateBookProgressOptions,
): Partial<Book> {
    if (options.syncRecord === undefined) {
        return {};
    }
    return {
        progress_updated_at: options.syncRecord.dateLastRead,
        sync_links: withSyncLink(currentBook.sync_links, options.syncRecord),
    };
}
