import type {
    Book,
    CalendarRowWithFinish,
    PlannerScheduleRow,
} from "../../../types/types.ts";
import { bookCoverSrc } from "../../books/model-normalize.ts";
import { isScheduleRowCompleted, sessionKeyFor } from "../../calendar/utils.ts";
import type {
    TodayCarouselBookItem,
    TodayCarouselSessionItem,
} from "./today-carousel-model-types.d.ts";

const EMPTY_TEXT = "";
const DEFAULT_TITLE = "Untitled";
const UNKNOWN_AUTHOR = "Unknown Author";

function normalizedBookId(value: unknown): string {
    return String(value || EMPTY_TEXT).trim();
}

export function booksById(books: Book[]): Map<string, Book> {
    const BY_ID = new Map<string, Book>();
    for (const BOOK of books) {
        const BOOK_ID = normalizedBookId(BOOK.book_id);
        if (BOOK_ID === EMPTY_TEXT) {
            continue;
        }
        BY_ID.set(BOOK_ID, BOOK);
    }
    return BY_ID;
}

function resolveBookTitle(
    row: PlannerScheduleRow,
    book: Book | undefined,
): string {
    const FROM_BOOK = String(book?.title || EMPTY_TEXT).trim();
    if (FROM_BOOK !== EMPTY_TEXT) {
        return FROM_BOOK;
    }
    const FROM_ROW = String(row.title || EMPTY_TEXT).trim();
    if (FROM_ROW !== EMPTY_TEXT) {
        return FROM_ROW;
    }
    return DEFAULT_TITLE;
}

function resolveAuthor(book: Book | undefined): string {
    const AUTHOR = String(book?.author || EMPTY_TEXT).trim();
    if (AUTHOR !== EMPTY_TEXT) {
        return AUTHOR;
    }
    return UNKNOWN_AUTHOR;
}

function toSessionItem(
    row: PlannerScheduleRow,
    scheduleCompletions: Record<string, boolean>,
): TodayCarouselSessionItem {
    const ROW_WITH_FINISH: CalendarRowWithFinish = {
        ...row,
        finish: Boolean(row.finish),
    };
    return {
        completed: isScheduleRowCompleted(row, scheduleCompletions),
        minutes: Math.max(1, Math.round(Number(row.minutes || 0))),
        row: ROW_WITH_FINISH,
        rowKey: sessionKeyFor(row),
    };
}

function firstIncompleteSession(
    sessions: TodayCarouselSessionItem[],
): TodayCarouselSessionItem | null {
    for (const SESSION of sessions) {
        if (!SESSION.completed) {
            return SESSION;
        }
    }
    return null;
}

function sessionByKey(
    sessions: TodayCarouselSessionItem[],
    rowKey: string,
): TodayCarouselSessionItem | null {
    for (const SESSION of sessions) {
        if (SESSION.rowKey === rowKey) {
            return SESSION;
        }
    }
    return null;
}

function resolvedTargetRow(options: {
    pinnedRowKey: string;
    sessions: TodayCarouselSessionItem[];
}): TodayCarouselSessionItem {
    const PINNED = sessionByKey(options.sessions, options.pinnedRowKey);
    if (PINNED !== null) {
        return PINNED;
    }
    const INCOMPLETE = firstIncompleteSession(options.sessions);
    if (INCOMPLETE !== null) {
        return INCOMPLETE;
    }
    const FIRST_SESSION = options.sessions[0];
    if (FIRST_SESSION === undefined) {
        throw new Error("Today carousel requires at least one session.");
    }
    return FIRST_SESSION;
}

function groupedSessionsByBookId(options: {
    scheduleCompletions: Record<string, boolean>;
    todayScheduleRows: PlannerScheduleRow[];
}): Map<string, TodayCarouselSessionItem[]> {
    const GROUPED = new Map<string, TodayCarouselSessionItem[]>();
    for (const ROW of options.todayScheduleRows) {
        const BOOK_ID = normalizedBookId(ROW.book_id);
        if (BOOK_ID === EMPTY_TEXT) {
            continue;
        }
        const EXISTING = GROUPED.get(BOOK_ID) ?? [];
        EXISTING.push(toSessionItem(ROW, options.scheduleCompletions));
        GROUPED.set(BOOK_ID, EXISTING);
    }
    return GROUPED;
}

function bookCoverSource(book: Book | undefined): string {
    if (book === undefined) {
        return EMPTY_TEXT;
    }
    return bookCoverSrc(book);
}

function carouselBookItem(options: {
    book: Book | undefined;
    bookId: string;
    pinnedRowKeyByBookId: Record<string, string>;
    sessions: TodayCarouselSessionItem[];
}): TodayCarouselBookItem {
    const FIRST_SESSION = resolvedTargetRow({
        pinnedRowKey: EMPTY_TEXT,
        sessions: options.sessions,
    });
    return {
        author: resolveAuthor(options.book),
        bookId: options.bookId,
        coverSrc: bookCoverSource(options.book),
        sessions: options.sessions,
        targetRow: resolvedTargetRow({
            pinnedRowKey:
                options.pinnedRowKeyByBookId[options.bookId] ?? EMPTY_TEXT,
            sessions: options.sessions,
        }),
        title: resolveBookTitle(FIRST_SESSION.row, options.book),
    };
}

function carouselBookItems(options: {
    booksById: Map<string, Book>;
    grouped: Map<string, TodayCarouselSessionItem[]>;
    pinnedRowKeyByBookId: Record<string, string>;
}): TodayCarouselBookItem[] {
    const OUTPUT: TodayCarouselBookItem[] = [];
    for (const [BOOK_ID, SESSIONS] of options.grouped.entries()) {
        OUTPUT.push(
            carouselBookItem({
                book: options.booksById.get(BOOK_ID),
                bookId: BOOK_ID,
                pinnedRowKeyByBookId: options.pinnedRowKeyByBookId,
                sessions: SESSIONS,
            }),
        );
    }
    return OUTPUT;
}

function bookDone(book: TodayCarouselBookItem): number {
    if (book.sessions.every((session) => session.completed)) {
        return 1;
    }
    return 0;
}

function sortedCarouselBooks(
    books: TodayCarouselBookItem[],
): TodayCarouselBookItem[] {
    return books.toSorted((left, right) => {
        const COMPLETION_ORDER = bookDone(left) - bookDone(right);
        if (COMPLETION_ORDER !== 0) {
            return COMPLETION_ORDER;
        }

        return left.title.localeCompare(right.title, undefined, {
            sensitivity: "base",
        });
    });
}

export function buildTodayCarouselBooks(options: {
    books: Book[];
    pinnedRowKeyByBookId: Record<string, string>;
    scheduleCompletions: Record<string, boolean>;
    todayScheduleRows: PlannerScheduleRow[];
}): TodayCarouselBookItem[] {
    return sortedCarouselBooks(
        carouselBookItems({
            booksById: booksById(options.books),
            grouped: groupedSessionsByBookId(options),
            pinnedRowKeyByBookId: options.pinnedRowKeyByBookId,
        }),
    );
}
