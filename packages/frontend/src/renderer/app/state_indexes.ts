import type { AppDerivedIndexes, Book, Session } from "../../types/types.ts";
import { localDayKeyFromIso } from "./date_keys.ts";

const COMPLETION_KEY_PART_DAY_BOOK = 2;
const COMPLETION_KEY_PART_SESSION = 3;

type CompletionIndexes = Pick<
    AppDerivedIndexes,
    "completionBySessionKey" | "completionByDayBookKey"
>;

function appendSessionGroup(
    index: Map<string, Session[]>,
    key: string,
    session: Session,
): void {
    const GROUPED = index.get(key);
    if (GROUPED === undefined) {
        index.set(key, [session]);
        return;
    }
    GROUPED.push(session);
}

function indexSessions(
    sessions: Session[],
    resolveKey: (session: Session) => string,
): Map<string, Session[]> {
    const INDEX = new Map<string, Session[]>();
    for (const SESSION of sessions) {
        const KEY = resolveKey(SESSION);
        if (KEY === "") {
            continue;
        }
        appendSessionGroup(INDEX, KEY, SESSION);
    }
    return INDEX;
}

function sessionDayKey(session: Session): string {
    return localDayKeyFromIso(session.ended_at) ?? "";
}

function sessionBookKey(session: Session): string {
    return String(session.book_id || "").trim();
}

function completionIndexTarget(
    key: string,
    indexes: CompletionIndexes,
): Record<string, boolean> | null {
    const PARTS = key.split("|");
    if (PARTS.length === COMPLETION_KEY_PART_SESSION) {
        return indexes.completionBySessionKey;
    }
    if (PARTS.length === COMPLETION_KEY_PART_DAY_BOOK) {
        return indexes.completionByDayBookKey;
    }
    return null;
}

/**
 * Builds a lookup map keyed by normalized `book_id`.
 * @param books - Book catalog rows.
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
 * @param sessions - Session history rows.
 * @returns Day-key grouped session map.
 */
export function sessionsByDayIndex(
    sessions: Session[] = [],
): Map<string, Session[]> {
    return indexSessions(sessions, sessionDayKey);
}

/**
 * Builds grouped sessions keyed by normalized `book_id`.
 * @param sessions - Session history rows.
 * @returns Book-id grouped session map.
 */
export function sessionsByBookIndex(
    sessions: Session[] = [],
): Map<string, Session[]> {
    return indexSessions(sessions, sessionBookKey);
}

/**
 * Splits completion state into explicit session-key and day-book key maps.
 * @param scheduleCompletions - Raw completion map.
 * @returns Derived completion map partitions.
 */
export function splitCompletionIndexes(
    scheduleCompletions: Record<string, boolean> = {},
): CompletionIndexes {
    const INDEXES: CompletionIndexes = {
        completionByDayBookKey: {},
        completionBySessionKey: {},
    };
    for (const [KEY, VALUE] of Object.entries(scheduleCompletions)) {
        const TARGET = completionIndexTarget(KEY, INDEXES);
        if (TARGET !== null) {
            TARGET[KEY] = Boolean(VALUE);
        }
    }
    return INDEXES;
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
