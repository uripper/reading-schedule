import type { Book } from "../../types/types.js";

export const SHELF_FILTER_ALL = "all";
export const SHELF_FILTER_UNSHELVED = "unshelved";
export const UNSHELVED_LABEL = "Unshelved";
export const SHELF_SELECT_CREATE_NEW = "__create_new_shelf__";

/**
 * Trims raw shelf names and normalizes nullish values to empty string.
 * @param rawShelf Shelf text from model or form state.
 * @returns Normalized shelf name.
 */
export function normalizeShelfName(
    rawShelf: string | null | undefined,
): string {
    return String(rawShelf ?? "").trim();
}

/**
 * Returns display shelf label for a book, including unshelved fallback.
 * @param book Book-like object containing optional shelf value.
 * @returns Shelf label for UI rendering.
 */
export function shelfLabelForBook(
    book: Pick<Book, "shelf"> | null | undefined,
): string {
    const SHELF = normalizeShelfName(book?.shelf);
    if (!SHELF) {
        return UNSHELVED_LABEL;
    }
    return SHELF;
}

/**
 * Checks whether a book matches the active shelf filter value.
 * @param book Book-like object containing optional shelf value.
 * @param filterValue Active shelf filter from toolbar.
 * @returns `true` when the book should remain visible.
 */
export function shelfFilterMatches(
    book: Pick<Book, "shelf"> | null | undefined,
    filterValue: string,
): boolean {
    const SHELF = normalizeShelfName(book?.shelf);
    if (filterValue === SHELF_FILTER_ALL) {
        return true;
    }
    if (filterValue === SHELF_FILTER_UNSHELVED) {
        return !SHELF;
    }
    return SHELF === filterValue;
}

/**
 * Collects unique non-empty shelf names sorted alphabetically.
 * @param books Books to scan for shelf values.
 * @returns Sorted unique shelf names.
 */
export function uniqueShelves(books: Pick<Book, "shelf">[] = []): string[] {
    const SHELF_SET = new Set<string>();
    // biome-ignore lint/complexity/noForEach: tracked for incremental cleanup
    books.forEach((book) => {
        const SHELF = normalizeShelfName(book.shelf);
        if (!SHELF) {
            return;
        }
        SHELF_SET.add(SHELF);
    });
    return [...SHELF_SET].sort((left, right) => {
        return left.localeCompare(right, undefined, { sensitivity: "base" });
    });
}
