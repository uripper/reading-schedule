import type { Book } from "../../../types/types.ts";
import { bookCoverSrc } from "../../books/model-normalize.ts";
import { todayKey } from "../../sessions/utils.ts";
import type { TodayAddBookOption } from "./today_add_book_overlay.ts";
import { openTodayAddBookOverlay } from "./today_add_book_overlay.ts";
import type { TodayCarouselActionBindings } from "./today_carousel_action_bindings.ts";
import type { TodayCarouselBookItem } from "./today_carousel_model.ts";

const DEFAULT_MANUAL_ADD_MINUTES = 10;
const EMPTY_TEXT = "";

type CandidateBook = ReturnType<
    TodayCarouselActionBindings["listSessionBooks"]
>[number];

type TodayAddBookBindings = Pick<
    TodayCarouselActionBindings,
    "listSessionBooks" | "onManualSessionAdded"
> & {
    rerender(): void;
    setStatus(message: string, isError?: boolean): void;
};

function addBookCandidates(options: {
    booksInTodayCarousel: string[];
    listSessionBooks: TodayAddBookBindings["listSessionBooks"];
}): ReturnType<TodayAddBookBindings["listSessionBooks"]> {
    const BOOK_IDS_IN_TODAY = new Set(options.booksInTodayCarousel);
    return options.listSessionBooks().filter((book) => {
        return !BOOK_IDS_IN_TODAY.has(book.bookId);
    });
}

function addManualSessionForBook(options: {
    bindings: TodayAddBookBindings;
    book: CandidateBook;
}): void {
    const ADDED = options.bindings.onManualSessionAdded({
        bookId: options.book.bookId,
        completed: false,
        date: todayKey(),
        minutes: DEFAULT_MANUAL_ADD_MINUTES,
    });
    if (!ADDED) {
        return;
    }
    options.bindings.rerender();
}

function bookMap(books: Book[]): Map<string, Book> {
    const BY_ID = new Map<string, Book>();
    for (const BOOK of books) {
        const BOOK_ID = String(BOOK.book_id || EMPTY_TEXT).trim();
        if (BOOK_ID === EMPTY_TEXT) {
            continue;
        }
        BY_ID.set(BOOK_ID, BOOK);
    }
    return BY_ID;
}

function overlayOptions(
    candidates: CandidateBook[],
    books: Book[],
): TodayAddBookOption[] {
    const BOOKS_BY_ID = bookMap(books);
    return candidates.map((candidate) => {
        const BOOK = BOOKS_BY_ID.get(candidate.bookId);
        let coverSrc = EMPTY_TEXT;
        if (BOOK !== undefined) {
            coverSrc = bookCoverSrc(BOOK);
        }
        return {
            bookId: candidate.bookId,
            coverSrc,
            title: candidate.title,
        };
    });
}

function candidateBooksForToday(
    bindings: TodayAddBookBindings,
    modelBooks: TodayCarouselBookItem[],
): CandidateBook[] {
    return addBookCandidates({
        booksInTodayCarousel: modelBooks.map((book) => {
            return book.bookId;
        }),
        listSessionBooks: bindings.listSessionBooks,
    });
}

function addLibraryBookToToday(options: {
    bindings: TodayAddBookBindings;
    books: Book[];
    modelBooks: TodayCarouselBookItem[];
}): void {
    const CANDIDATES = candidateBooksForToday(
        options.bindings,
        options.modelBooks,
    );
    if (CANDIDATES.length === 0) {
        options.bindings.setStatus(
            "All library books are already scheduled for today.",
        );
        return;
    }
    openTodayAddBookOverlay({
        onPick: (bookId) => {
            const SELECTED_BOOK = CANDIDATES.find((candidate) => {
                return candidate.bookId === bookId;
            });
            if (SELECTED_BOOK === undefined) {
                return;
            }
            addManualSessionForBook({
                bindings: options.bindings,
                book: SELECTED_BOOK,
            });
        },
        options: overlayOptions(CANDIDATES, options.books),
    });
}

export function addBookHandler(options: {
    bindings: TodayAddBookBindings | null;
    books: Book[];
    modelBooks: TodayCarouselBookItem[];
}): (() => void) | undefined {
    const BINDINGS = options.bindings;
    if (BINDINGS === null) {
        return undefined;
    }
    if (!candidateBooksForToday(BINDINGS, options.modelBooks).length) {
        return undefined;
    }
    return () => {
        addLibraryBookToToday({
            bindings: BINDINGS,
            books: options.books,
            modelBooks: options.modelBooks,
        });
    };
}
