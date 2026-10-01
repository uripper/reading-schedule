/**
 * Resolves planner finish estimates against authoritative book completion state.
 */
import type { Book } from "../../types/types.ts";
import { BOOK_STATUS_READ } from "../books/status_catalog.ts";
import type { plannedFinishBookIds } from "./helpers-metrics.ts";

/**
 * Removes stale planner finishes for books whose recorded completion is authoritative.
 */
export function plannedFinishesForUnreadBooks(
    books: readonly Book[],
    planned: ReturnType<typeof plannedFinishBookIds>,
): ReturnType<typeof plannedFinishBookIds> {
    const READ_BOOK_IDS = new Set(
        books
            .filter((book) => book.status === BOOK_STATUS_READ)
            .map((book) => book.book_id),
    );
    const UNREAD_ENTRIES = [...planned.monthByBookId].filter(([bookId]) => {
        return !READ_BOOK_IDS.has(bookId);
    });
    return {
        ids: new Set(UNREAD_ENTRIES.map(([bookId]) => bookId)),
        monthByBookId: new Map(UNREAD_ENTRIES),
    };
}
