import type { Book } from "../../types/types.ts";

interface NextBlockedByOptions {
    book: Book;
    inheritedId: string | null;
    remainingIds: Set<string>;
    removedBookId: string;
}

function normalizedBookId(value: string | null | undefined): string {
    return String(value ?? "").trim();
}

function bookIdSet(books: Book[]): Set<string> {
    const IDS = new Set<string>();
    for (const BOOK of books) {
        IDS.add(normalizedBookId(BOOK.book_id));
    }
    return IDS;
}

function removedBook(books: Book[], removedBookId: string): Book | null {
    const REMOVED_ID = normalizedBookId(removedBookId);
    return (
        books.find((book) => normalizedBookId(book.book_id) === REMOVED_ID) ??
        null
    );
}

function inheritedBlockerId(
    removed: Book,
    remainingIds: Set<string>,
): string | null {
    const BLOCKER_ID = normalizedBookId(removed.blocked_by);
    if (BLOCKER_ID === "") {
        return null;
    }
    if (!remainingIds.has(BLOCKER_ID)) {
        return null;
    }
    return BLOCKER_ID;
}

function nextBlockedBy(options: NextBlockedByOptions): string | null {
    const CURRENT_ID = normalizedBookId(options.book.book_id);
    const BLOCKER_ID = normalizedBookId(options.book.blocked_by);
    if (BLOCKER_ID === "") {
        return null;
    }
    if (BLOCKER_ID === options.removedBookId) {
        return inheritedBlockerForBook(CURRENT_ID, options.inheritedId);
    }
    if (!options.remainingIds.has(BLOCKER_ID) || BLOCKER_ID === CURRENT_ID) {
        return null;
    }
    return BLOCKER_ID;
}

function inheritedBlockerForBook(
    bookId: string,
    inheritedId: string | null,
): string | null {
    if (inheritedId === null) {
        return null;
    }
    if (inheritedId === bookId) {
        return null;
    }
    return inheritedId;
}

function bookWithBlocker(book: Book, blockedBy: string | null): Book {
    if ((book.blocked_by ?? null) === blockedBy) {
        return book;
    }
    return {
        ...book,
        blocked_by: blockedBy,
    };
}

function remainingBooks(books: Book[], removedBookId: string): Book[] {
    return books.filter((book) => {
        return normalizedBookId(book.book_id) !== removedBookId;
    });
}

export function booksAfterRemovingBook(
    books: Book[],
    removedBookId: string,
): Book[] {
    const REMOVED_ID = normalizedBookId(removedBookId);
    const REMOVED_BOOK = removedBook(books, REMOVED_ID);
    if (REMOVED_BOOK === null) {
        return books;
    }
    const REMAINING_BOOKS = remainingBooks(books, REMOVED_ID);
    const REMAINING_IDS = bookIdSet(REMAINING_BOOKS);
    const INHERITED_ID = inheritedBlockerId(REMOVED_BOOK, REMAINING_IDS);
    return REMAINING_BOOKS.map((book) => {
        return bookWithBlocker(
            book,
            nextBlockedBy({
                book,
                inheritedId: INHERITED_ID,
                remainingIds: REMAINING_IDS,
                removedBookId: REMOVED_ID,
            }),
        );
    });
}

/**
 * Follows one book's "after" chain and reports whether it reaches a target.
 * @param startId - Book whose chain is followed.
 * @param targetId - Book being looked for.
 * @param blockerById - Each book's `blocked_by`, keyed by book id.
 * @returns `true` when the chain reaches the target.
 */
function chainReaches(
    startId: string,
    targetId: string,
    blockerById: Map<string, string>,
): boolean {
    const SEEN = new Set<string>();
    let current = startId;
    while (current !== "" && !SEEN.has(current)) {
        if (current === targetId) {
            return true;
        }
        SEEN.add(current);
        current = blockerById.get(current) ?? "";
    }
    return false;
}

/**
 * Maps each book id to the id of the book it comes after.
 * @param books - Library books.
 * @returns `blocked_by` by book id; empty text when none.
 */
function blockerIdsByBook(books: Book[]): Map<string, string> {
    return new Map(
        books.map((book) => [
            normalizedBookId(book.book_id),
            normalizedBookId(book.blocked_by),
        ]),
    );
}

/**
 * Lists books that already come after a book, directly or through others.
 * Choosing any of them as that book's "after" target would create a cycle.
 * @param books - Library books.
 * @param bookId - Book being edited.
 * @returns Ids of books whose chain leads back to the book.
 */
export function blockedDescendantIds(
    books: Book[],
    bookId: string,
): Set<string> {
    const TARGET_ID = normalizedBookId(bookId);
    const DESCENDANTS = new Set<string>();
    if (TARGET_ID === "") {
        return DESCENDANTS;
    }
    const BLOCKER_BY_ID = blockerIdsByBook(books);
    for (const [ID, BLOCKER_ID] of BLOCKER_BY_ID) {
        if (
            ID !== TARGET_ID &&
            chainReaches(BLOCKER_ID, TARGET_ID, BLOCKER_BY_ID)
        ) {
            DESCENDANTS.add(ID);
        }
    }
    return DESCENDANTS;
}

/**
 * Checks whether a book's After Book changed between two library snapshots.
 * @param book - Book in the new snapshot.
 * @param previous - `blocked_by` by book id before the change.
 * @returns `true` when the link is new or different.
 */
function blockerChanged(book: Book, previous: Map<string, string>): boolean {
    const ID = normalizedBookId(book.book_id);
    return previous.get(ID) !== normalizedBookId(book.blocked_by);
}

/**
 * Rejects a save whose new After Book links make books wait on each other.
 * The check runs against the latest library, so a choice that was valid when
 * the picker opened but became a cycle since is still caught.
 * @param before - Library before the save.
 * @param after - Library the save would commit.
 * @throws {Error} When a changed link closes a loop.
 */
export function assertNoNewBlockerCycle(before: Book[], after: Book[]): void {
    const PREVIOUS = blockerIdsByBook(before);
    const NEXT = blockerIdsByBook(after);
    for (const BOOK of after) {
        if (!blockerChanged(BOOK, PREVIOUS)) {
            continue;
        }
        const ID = normalizedBookId(BOOK.book_id);
        if (chainReaches(NEXT.get(ID) ?? "", ID, NEXT)) {
            throw new Error(
                `"${BOOK.title}" can't come after a book that already comes after it. Choose another After Book.`,
            );
        }
    }
}
