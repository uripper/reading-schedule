/** Validates reviewed choices again and saves imports with their source history in one snapshot. */
import type {
    Book,
    KoboImportChoice,
    KoboImportStore,
} from "@reading-schedule/contracts";
import { updatedProgressBook } from "../books/controller-progress.ts";
import { progressHistory } from "../books/progress-history.ts";
import { assessKoboProgress } from "./model.ts";

/** Refuses batches that assign multiple device records to the same library book. */
function ensureUniqueTargets(
    choices: readonly KoboImportChoice[],
    books: readonly Book[],
): void {
    const COUNTS = new Map<string, number>();
    for (const CHOICE of choices) {
        COUNTS.set(CHOICE.bookId, (COUNTS.get(CHOICE.bookId) ?? 0) + 1);
    }
    const DUPLICATES = choices.filter(
        (choice) => (COUNTS.get(choice.bookId) ?? 0) > 1,
    );
    if (DUPLICATES.length === 0) {
        return;
    }
    const DETAILS = DUPLICATES.map((choice) => {
        const TITLE =
            books.find((book) => book.book_id === choice.bookId)?.title ??
            "Missing library book";
        return `“${choice.record.title}” (${choice.record.percentRead}%) → “${TITLE}”`;
    });
    throw new Error(
        `Kobo records select the same book: ${DETAILS.join("; ")}.`,
    );
}

/** Rechecks freshness at approval time, including edits made since the popup opened. */
function approvedBook(
    choice: KoboImportChoice,
    books: readonly Book[],
): Book | null {
    const BOOK = books.find((book) => book.book_id === choice.bookId);
    if (BOOK === undefined) {
        return null;
    }
    const ASSESSMENT = assessKoboProgress(choice.record, BOOK);
    if (ASSESSMENT.kind === "blocked" || ASSESSMENT.kind === "unchanged") {
        return null;
    }
    if (ASSESSMENT.kind === "link") {
        return { ...BOOK, kobo_progress: choice.record };
    }
    return updatedProgressBook(
        BOOK,
        { progressPercent: choice.record.percentRead },
        {
            completedAt: choice.record.dateLastRead.slice(
                0,
                "YYYY-MM-DD".length,
            ),
            koboProgress: choice.record,
            markStarted: true,
        },
    );
}

/** Builds an import batch without mutating library books or recording failed choices. */
export function prepareKoboImport(
    books: readonly Book[],
    choices: readonly KoboImportChoice[],
) {
    ensureUniqueTargets(choices, books);
    const UPDATED = new Map<string, Book>();
    const FAILED: string[] = [];
    for (const CHOICE of choices) {
        const BOOK = approvedBook(CHOICE, books);
        if (BOOK === null) {
            FAILED.push(CHOICE.record.title);
        } else {
            UPDATED.set(BOOK.book_id, BOOK);
        }
    }
    return {
        books: books.map((book) => UPDATED.get(book.book_id) ?? book),
        failed: FAILED,
        imported: UPDATED.size,
    };
}

/** Restores only this batch's unchanged progress, preserving unrelated concurrent edits. */
function restoredBook(current: Book, previous: Book, staged: Book): Book {
    if (
        current.progress_updated_at !== staged.progress_updated_at ||
        current.progress_percent !== staged.progress_percent ||
        current.pages_read !== staged.pages_read
    ) {
        return current;
    }
    const RESTORED = {
        ...current,
        finished_at: previous.finished_at,
        pages_read: previous.pages_read,
        progress_percent: previous.progress_percent,
        status: previous.status,
    };
    delete RESTORED.kobo_progress;
    delete RESTORED.progress_updated_at;
    return { ...RESTORED, ...progressHistory(previous) };
}

/** Rolls back staged values without replacing books edited or added during persistence. */
function rollbackImport(
    store: KoboImportStore,
    before: readonly Book[],
    staged: readonly Book[],
): void {
    const PREVIOUS = new Map(before.map((book) => [book.book_id, book]));
    const STAGED = new Map(staged.map((book) => [book.book_id, book]));
    const RESTORED = store.getBooks().map((book) => {
        const ORIGINAL = PREVIOUS.get(book.book_id);
        const NEXT = STAGED.get(book.book_id);
        if (ORIGINAL === undefined || NEXT === undefined || ORIGINAL === NEXT) {
            return book;
        }
        return restoredBook(book, ORIGINAL, NEXT);
    });
    store.replaceBooks(RESTORED);
    store.changed();
}

/** Makes progress and source receipts durable together, restoring staged changes on failure. */
async function saveImport(
    store: KoboImportStore,
    before: readonly Book[],
    staged: Book[],
): Promise<void> {
    try {
        store.replaceBooks(staged);
        if (!(await store.save())) {
            throw new Error("State persistence failed.");
        }
    } catch (error) {
        rollbackImport(store, before, staged);
        throw new Error(
            "Could not save Kobo progress. Changes were restored; retry the import.",
            { cause: error },
        );
    }
    store.changed();
}

/** Flushes prior changes, revalidates choices, and commits a reviewed batch. */
export async function applyKoboImport(
    store: KoboImportStore,
    choices: readonly KoboImportChoice[],
) {
    if (!(await store.flush())) {
        throw new Error(
            "Could not save current progress. Retry before importing from Kobo.",
        );
    }
    const BEFORE = store.getBooks();
    const BATCH = prepareKoboImport(BEFORE, choices);
    await saveImport(store, BEFORE, BATCH.books);
    return BATCH;
}
