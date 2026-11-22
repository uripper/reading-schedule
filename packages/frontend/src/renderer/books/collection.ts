/**
 * Collection model rules. Unlike a shelf, a book can belong to any number of
 * collections, so a book stores a list of names rather than a single value.
 */
import type { Book } from "../../types/types.ts";

/** Filter value that shows every book; never a valid collection name. */
export const COLLECTION_FILTER_ALL = "__all_collections__";
/** Filter value that shows only books outside every collection. */
export const COLLECTION_FILTER_NONE = "__no_collection__";
export const NO_COLLECTION_LABEL = "No Collection";

/**
 * Compares collection names alphabetically, ignoring case and accents.
 * @param left - Left collection name.
 * @param right - Right collection name.
 * @returns Negative, zero, or positive sort order.
 */
export function compareCollectionNames(left: string, right: string): number {
    return left.localeCompare(right, undefined, { sensitivity: "base" });
}

/**
 * Trims a raw collection name and normalizes nullish values to empty string.
 * @param rawName - Collection text from storage or form input.
 * @returns Normalized collection name.
 */
export function normalizeCollectionName(rawName: unknown): string {
    if (typeof rawName !== "string") {
        return "";
    }
    return rawName.trim();
}

/**
 * Adds a name to the list unless an equal name (ignoring case) is present.
 * @param names - Collected names so far.
 * @param name - Normalized candidate name.
 */
function addDistinctName(names: string[], name: string): void {
    if (name === "") {
        return;
    }
    if (
        names.some((existing) => compareCollectionNames(existing, name) === 0)
    ) {
        return;
    }
    names.push(name);
}

/**
 * Narrows unknown input to an array without widening its items to `any`.
 * @param value - Raw value from storage or IPC.
 * @returns `true` when the value is an array.
 */
function isUnknownArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
}

/**
 * Normalizes stored collections into trimmed, distinct, sorted names.
 * Legacy books without the field normalize to an empty list.
 * @param rawCollections - Collections value from storage, form, or IPC.
 * @returns Distinct collection names sorted alphabetically.
 */
export function normalizeCollections(rawCollections: unknown): string[] {
    if (!isUnknownArray(rawCollections)) {
        return [];
    }
    const NAMES: string[] = [];
    for (const RAW_NAME of rawCollections) {
        addDistinctName(NAMES, normalizeCollectionName(RAW_NAME));
    }
    return NAMES.toSorted(compareCollectionNames);
}

/**
 * Checks whether a book matches the active collection filter value.
 * @param book - Book-like object containing optional collections.
 * @param filterValue - Active collection filter from the toolbar.
 * @returns `true` when the book should remain visible.
 */
export function collectionFilterMatches(
    book: Partial<Pick<Book, "collections">> | null | undefined,
    filterValue: string,
): boolean {
    if (filterValue === COLLECTION_FILTER_ALL || filterValue === "") {
        return true;
    }
    const COLLECTIONS = normalizeCollections(book?.collections);
    if (filterValue === COLLECTION_FILTER_NONE) {
        return COLLECTIONS.length === 0;
    }
    return COLLECTIONS.some((name) => {
        return compareCollectionNames(name, filterValue) === 0;
    });
}

/**
 * Collects every distinct collection name used across books.
 * @param books - Books to scan for collection names.
 * @returns Sorted distinct collection names.
 */
export function uniqueCollections(
    books: Partial<Pick<Book, "collections">>[] = [],
): string[] {
    const ALL_NAMES: unknown[] = [];
    for (const BOOK of books) {
        ALL_NAMES.push(...normalizeCollections(BOOK.collections));
    }
    return normalizeCollections(ALL_NAMES);
}
