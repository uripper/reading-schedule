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
	const byId = new Map<string, Book>();
	books.forEach((book) => {
		const bookId = String(book.book_id || "").trim();
		if (!bookId) {
			return;
		}
		byId.set(bookId, book);
	});
	return byId;
}

/**
 * Builds grouped sessions keyed by local `YYYY-MM-DD`.
 * @param sessions Session history rows.
 * @returns Day-key grouped session map.
 */
export function sessionsByDayIndex(
	sessions: Session[] = [],
): Map<string, Session[]> {
	const byDay = new Map<string, Session[]>();
	sessions.forEach((session) => {
		const dayKey = isoLocalDayKey(session.ended_at);
		if (!dayKey) {
			return;
		}
		const grouped = byDay.get(dayKey);
		if (grouped) {
			grouped.push(session);
			return;
		}
		byDay.set(dayKey, [session]);
	});
	return byDay;
}

/**
 * Builds grouped sessions keyed by normalized `book_id`.
 * @param sessions Session history rows.
 * @returns Book-id grouped session map.
 */
export function sessionsByBookIndex(
	sessions: Session[] = [],
): Map<string, Session[]> {
	const byBook = new Map<string, Session[]>();
	sessions.forEach((session) => {
		const bookId = String(session.book_id || "").trim();
		if (!bookId) {
			return;
		}
		const grouped = byBook.get(bookId);
		if (grouped) {
			grouped.push(session);
			return;
		}
		byBook.set(bookId, [session]);
	});
	return byBook;
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
	const completionBySessionKey: Record<string, boolean> = {};
	const completionByDayBookKey: Record<string, boolean> = {};
	Object.entries(scheduleCompletions).forEach(([key, value]) => {
		const parts = key.split("|");
		if (parts.length === COMPLETION_KEY_PART_SESSION) {
			completionBySessionKey[key] = Boolean(value);
			return;
		}
		if (parts.length === COMPLETION_KEY_PART_DAY_BOOK) {
			completionByDayBookKey[key] = Boolean(value);
		}
	});
	return { completionBySessionKey, completionByDayBookKey };
}

/**
 * Creates empty derived index containers for app runtime bootstrap.
 * @returns Empty derived index object.
 */
export function emptyDerivedIndexes(): AppDerivedIndexes {
	return {
		bookById: new Map<string, Book>(),
		sessionsByDay: new Map<string, Session[]>(),
		sessionsByBook: new Map<string, Session[]>(),
		completionBySessionKey: {},
		completionByDayBookKey: {},
	};
}
