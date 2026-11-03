/** Builds the searchable text fields used by Library keyword search. */
import type { Book } from "../../types/types.ts";
import { shelfLabelForBook } from "./shelf.ts";
import { statusLabel } from "./status_catalog.ts";

export const KEYWORD_SEARCH_HINT =
    "Searches title, author, shelf, status, lookup note, due date, finished date, and page count.";

/**
 * Formats an optional positive count as searchable text.
 * @param value - Optional numeric metadata value.
 * @returns Count text, or `null` when the value is missing or not positive.
 */
function positiveCountText(value: number | null | undefined): string | null {
    if (value === null || value === undefined || value <= 0) {
        return null;
    }
    return String(value);
}

/**
 * Collects the persisted book metadata that participates in keyword search.
 * Series is not a book field, so it is not searchable. Keep
 * `KEYWORD_SEARCH_HINT` in sync when changing this list.
 * @param book - Book to describe.
 * @returns Text fields matched against each search keyword.
 */
export function bookKeywordFields(book: Book): Array<string | null> {
    return [
        book.title,
        book.author,
        shelfLabelForBook(book),
        statusLabel(book.status),
        book.lookup_note,
        book.deadline,
        book.finished_at,
        positiveCountText(book.pages_total),
    ];
}
