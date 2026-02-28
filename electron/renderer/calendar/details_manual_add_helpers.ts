import { type ManualSessionBook } from "../../types/types.js";
import {
    normalizeTitleFilterQuery,
    titleMatchesNormalizedQuery,
} from "../title_filter.js";

/**
 * Returns default string value for manual minutes input field.
 * @param defaultMinutes Optional prefilled minutes value.
 * @returns Positive integer text with fallback of `"10"`.
 */
export function minuteValueForManualInput(defaultMinutes?: number): string {
    const parsed = Number(defaultMinutes ?? 0);
    if (Number.isFinite(parsed) && parsed > 0) {
        return String(Math.max(1, Math.round(parsed)));
    }
    return "10";
}

/**
 * Returns session books sorted alphabetically by title.
 * @param books Available manual-session books.
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

/**
 * Filters manual-session books by case-insensitive title substring.
 * @param books Available manual-session books.
 * @param query User-entered title query text.
 * @returns Books whose title contains the query text.
 */
export function booksMatchingTitleQuery(
    books: ManualSessionBook[],
    query: string,
): ManualSessionBook[] {
    const normalizedQuery = normalizeTitleFilterQuery(query);
    if (normalizedQuery === "") {
        return [...books];
    }
    return books.filter((book) => {
        return titleMatchesNormalizedQuery(book.title, normalizedQuery);
    });
}
