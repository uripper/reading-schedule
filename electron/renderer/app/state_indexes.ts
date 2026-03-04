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

    for (const BOOK of books) {
        const BOOK_ID = String(BOOK.book_id || "").trim();
        if (!BOOK_ID) {
            continue;
        }
        BY_ID.set(BOOK_ID, BOOK);
    }
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

    for (const SESSION of sessions) {
        const DAY_KEY = isoLocalDayKey(SESSION.ended_at);
        if (!DAY_KEY) {
            continue;
        }
        const GROUPED = BY_DAY.get(DAY_KEY);
        if (GROUPED) {
            GROUPED.push(SESSION);
            continue;
        }
        BY_DAY.set(DAY_KEY, [SESSION]);
    }
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

    for (const SESSION of sessions) {
        const BOOK_ID = String(SESSION.book_id || "").trim();
        if (!BOOK_ID) {
            continue;
        }
        const GROUPED = BY_BOOK.get(BOOK_ID);
        if (GROUPED) {
            GROUPED.push(SESSION);
            continue;
        }
        BY_BOOK.set(BOOK_ID, [SESSION]);
    }
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

    for (const [KEY, VALUE] of Object.entries(scheduleCompletions)) {
        const PARTS = KEY.split("|");
        if (PARTS.length === COMPLETION_KEY_PART_SESSION) {
            COMPLETION_BY_SESSION_KEY[KEY] = Boolean(VALUE);
            continue;
        }
        if (PARTS.length === COMPLETION_KEY_PART_DAY_BOOK) {
            COMPLETION_BY_DAY_BOOK_KEY[KEY] = Boolean(VALUE);
        }
    }
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
