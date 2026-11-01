/** Coordinates transient cover jobs without retaining stale library snapshots. */
import type { Book } from "../../types/types.ts";
import { errorMessage } from "../app/plan-errors.ts";
import { addLog } from "../help.ts";
import { applyCompletedCoverToForm } from "./cover-form-sync.ts";
import { stagedCoverUpload } from "./cover-upload-staging.ts";
import { bookWithoutTransientCover, hydrateBookCover } from "./save.ts";

/** Checks cover fields so ordinary edits and progress changes survive completion. */
function hasSameCover(first: Book, second: Book | undefined): boolean {
    return (
        first.cover_url === second?.cover_url &&
        first.cover_local_path === second?.cover_local_path
    );
}

/** Identifies sources that need native work rather than an existing local asset. */
function needsProcessing(source: Book): boolean {
    if (stagedCoverUpload(source.cover_local_path) !== undefined) {
        return true;
    }
    return Boolean(source.cover_url) && !source.cover_local_path;
}

/** Owns job identities for one live controller; none of this state is persisted. */
export class BookCoverJobs {
    private readonly jobs = new Map<string, Book>();

    private readonly readBooks: () => Book[];
    private readonly commitCover: (book: Book) => void;

    public constructor(
        readBooks: () => Book[],
        commitCover: (book: Book) => void,
    ) {
        this.readBooks = readBooks;
        this.commitCover = commitCover;
    }

    /** Invalidates work when deletion or a different cover changes the live library. */
    public retain(books: Book[]): void {
        for (const [BookId, Expected] of this.jobs) {
            const CURRENT = books.find((book) => book.book_id === BookId);
            if (!hasSameCover(Expected, CURRENT)) {
                this.jobs.delete(BookId);
            }
        }
    }

    /** Invalidates all pending results when persisted state replaces the library. */
    public reset(): void {
        this.jobs.clear();
    }

    /** Starts image work without making it part of the book-save promise. */
    public queue(source: Book): Promise<void> {
        const EXISTING = this.jobs.get(source.book_id);
        if (EXISTING !== undefined && hasSameCover(EXISTING, source)) {
            return Promise.resolve();
        }
        this.jobs.delete(source.book_id);
        if (!needsProcessing(source)) {
            return Promise.resolve();
        }
        const EXPECTED = bookWithoutTransientCover(source);
        this.jobs.set(source.book_id, EXPECTED);
        return hydrateBookCover(source)
            .then((hydrated) => this.applyCover(EXPECTED, hydrated))
            .catch((error: unknown) => this.reportFailure(EXPECTED, error))
            .finally(() => this.finish(EXPECTED));
    }

    /** Patches the latest book only while this result still owns its cover selection. */
    private applyCover(expected: Book, hydrated: Book): void {
        if (this.jobs.get(expected.book_id) !== expected) {
            return;
        }
        const CURRENT = this.readBooks().find(
            (book) => book.book_id === expected.book_id,
        );
        if (CURRENT !== undefined && hasSameCover(expected, CURRENT)) {
            const COMPLETED = {
                ...CURRENT,
                cover_local_path: hydrated.cover_local_path,
            };
            applyCompletedCoverToForm(expected, COMPLETED);
            this.commitCover(COMPLETED);
        }
    }

    /** Reports recoverable failures through the existing Help/Logs surface. */
    private reportFailure(expected: Book, error: unknown): void {
        if (this.jobs.get(expected.book_id) !== expected) {
            return;
        }
        const MESSAGE = errorMessage(error);
        addLog(
            `Book saved; cover unavailable for "${expected.title}". Select its cover again to retry. ${MESSAGE}`,
        );
    }

    /** Leaves newer jobs intact when an older operation finishes later. */
    private finish(expected: Book): void {
        if (this.jobs.get(expected.book_id) === expected) {
            this.jobs.delete(expected.book_id);
        }
    }
}

/** Keeps unexpected callback failures visible through the existing log surface. */
export function reportCoverCommitError(error: unknown): void {
    addLog(`Could not apply the completed cover: ${errorMessage(error)}`);
}
