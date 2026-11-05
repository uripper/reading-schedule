/** Orders the books offered by the calendar's manual add panel. */
import type { ManualSessionBook } from "../../types/types.ts";

/**
 * Returns session books sorted alphabetically by title.
 * @param books - Available manual-session books.
 * @returns Sorted copy of manual session books.
 */
export function sortedManualBooks(
    books: ManualSessionBook[] = [],
): ManualSessionBook[] {
    return [...books].sort((left, right) => {
        return String(left.title || "").localeCompare(
            String(right.title || ""),
            undefined,
            { sensitivity: "base" },
        );
    });
}
