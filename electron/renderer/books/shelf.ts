// @ts-nocheck

export const SHELF_FILTER_ALL = "all";
export const SHELF_FILTER_UNSHELVED = "unshelved";
export const UNSHELVED_LABEL = "Unshelved";
export const SHELF_SELECT_CREATE_NEW = "__create_new_shelf__";

export function normalizeShelfName(rawShelf) {
  return String(rawShelf || "").trim();
}

export function shelfLabelForBook(book) {
  const shelf = normalizeShelfName(book?.shelf);
  if (!shelf) {
    return UNSHELVED_LABEL;
  }
  return shelf;
}

export function shelfFilterMatches(book, filterValue) {
  const shelf = normalizeShelfName(book?.shelf);
  if (filterValue === SHELF_FILTER_ALL) {
    return true;
  }
  if (filterValue === SHELF_FILTER_UNSHELVED) {
    return !shelf;
  }
  return shelf === filterValue;
}

export function uniqueShelves(books = []) {
  const shelfSet = new Set();
  books.forEach((book) => {
    const shelf = normalizeShelfName(book?.shelf);
    if (!shelf) {
      return;
    }
    shelfSet.add(shelf);
  });
  return [...shelfSet].sort((left, right) => {
    return left.localeCompare(right, undefined, { sensitivity: "base" });
  });
}
