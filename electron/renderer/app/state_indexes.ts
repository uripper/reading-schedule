import type { AppDerivedIndexes, Book, Session } from "../../types/types.js";
import { isoLocalDayKey } from "../sessions/utils.js";

const COMPLETION_KEY_PART_DAY_BOOK = 2;
const COMPLETION_KEY_PART_SESSION = 3;

/**
 * Builds a lookup map keyed by normalized `book_id`.
 * @param books Book catalog rows.
 * @returns Map of book id to book payload.
 */
export function bookByIdIndex(books: Book[] = []): Map<string, Book> {
    const BY_ID = new Map<string, Book>();

    books.forEach((book) => {
        const BOOK_ID = String(book.book_id || "").trim();
        if (!BOOK_ID) {
            return;
        }
        BY_ID.set(BOOK_ID, book);
    });
    return BY_ID;
}

/**
 * Builds grouped sessions keyed by local `YYYY-MM-DD`.
 * @param sessions Session history rows.
 * @returns Day-key grouped session map.
 */
export function sessionsByDayIndex(
    sessions: Session[] = [],
): Map<string, Session[]> {
    const BY_DAY = new Map<string, Session[]>();

    sessions.forEach((session) => {
        const DAY_KEY = isoLocalDayKey(session.ended_at);
        if (!DAY_KEY) {
            return;
        }
        const GROUPED = BY_DAY.get(DAY_KEY);
        if (GROUPED) {
            GROUPED.push(session);
            return;
        }
        BY_DAY.set(DAY_KEY, [session]);
    });
    return BY_DAY;
}

/**
 * Builds grouped sessions keyed by normalized `book_id`.
 * @param sessions Session history rows.
 * @returns Book-id grouped session map.
 */
export function sessionsByBookIndex(
    sessions: Session[] = [],
): Map<string, Session[]> {
    const BY_BOOK = new Map<string, Session[]>();

    sessions.forEach((session) => {
        const BOOK_ID = String(session.book_id || "").trim();
        if (!BOOK_ID) {
            return;
        }
        const GROUPED = BY_BOOK.get(BOOK_ID);
        if (GROUPED) {
            GROUPED.push(session);
            return;
        }
        BY_BOOK.set(BOOK_ID, [session]);
    });
    return BY_BOOK;
}

/**
 * Splits completion state into explicit session-key and day-book key maps.
 * @param scheduleCompletions Raw completion map.
 * @returns Derived completion map partitions.
 */
export function splitCompletionIndexes(
    scheduleCompletions: Record<string, boolean> = {},
): Pick<
    AppDerivedIndexes,
    "completionBySessionKey" | "completionByDayBookKey"
> {
    const COMPLETION_BY_SESSION_KEY: Record<string, boolean> = {};
    const COMPLETION_BY_DAY_BOOK_KEY: Record<string, boolean> = {};

    Object.entries(scheduleCompletions).forEach(([key, value]) => {
        const PARTS = key.split("|");
        if (PARTS.length === COMPLETION_KEY_PART_SESSION) {
            COMPLETION_BY_SESSION_KEY[key] = Boolean(value);
            return;
        }
        if (PARTS.length === COMPLETION_KEY_PART_DAY_BOOK) {
            COMPLETION_BY_DAY_BOOK_KEY[key] = Boolean(value);
        }
    });
    return {
        completionByDayBookKey: COMPLETION_BY_DAY_BOOK_KEY,
        completionBySessionKey: COMPLETION_BY_SESSION_KEY,
    };
}

/**
 * Creates empty derived index containers for app runtime bootstrap.
 * @returns Empty derived index object.
 */
export function emptyDerivedIndexes(): AppDerivedIndexes {
    return {
        bookById: new Map<string, Book>(),
        completionByDayBookKey: {},
        completionBySessionKey: {},
        sessionsByBook: new Map<string, Session[]>(),
        sessionsByDay: new Map<string, Session[]>(),
    };
}
