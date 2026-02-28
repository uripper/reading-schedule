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
  const shelf = normalizeShelfName(book?.shelf);
  if (!shelf) {
    return UNSHELVED_LABEL;
  }
  return shelf;
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
  const shelf = normalizeShelfName(book?.shelf);
  if (filterValue === SHELF_FILTER_ALL) {
    return true;
  }
  if (filterValue === SHELF_FILTER_UNSHELVED) {
    return !shelf;
  }
  return shelf === filterValue;
}

/**
 * Collects unique non-empty shelf names sorted alphabetically.
 * @param books Books to scan for shelf values.
 * @returns Sorted unique shelf names.
 */
export function uniqueShelves(
  books: Array<Pick<Book, "shelf">> = [],
): string[] {
  const shelfSet = new Set<string>();
  books.forEach((book) => {
    const shelf = normalizeShelfName(book.shelf);
    if (!shelf) {
      return;
    }
    shelfSet.add(shelf);
  });
  return [...shelfSet].sort((left, right) => {
    return left.localeCompare(right, undefined, { sensitivity: "base" });
  });
}
