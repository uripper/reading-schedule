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
