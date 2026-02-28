import type { Book, PickerInteraction } from "../../types/types.js";

const NO_ACTIVE_INDEX = -1;

/**
 * Builds label text used for after-book picker options and input value.
 * @param book Book record.
 * @returns Display label combining title and author when available.
 */
export function optionLabel(book: Book): string {
  const title = String(book.title || "Untitled");
  const author = String(book.author || "").trim();
  if (!author) {
    return title;
  }
  return `${title} - ${author}`;
}

/**
 * Sorts books by title then author using case-insensitive comparison.
 * @param left Left book.
 * @param right Right book.
 * @returns Locale compare result.
 */
export function compareBooks(left: Book, right: Book): number {
  const titleCompare = String(left.title || "").localeCompare(
    String(right.title || ""),
    undefined,
    { sensitivity: "base" },
  );
  if (titleCompare !== 0) {
    return titleCompare;
  }
  return String(left.author || "").localeCompare(
    String(right.author || ""),
    undefined,
    { sensitivity: "base" },
  );
}

/**
 * Wraps an index into valid range for cyclic keyboard navigation.
 * @param index Candidate index.
 * @param length Number of available options.
 * @returns Wrapped index, or -1 when there are no options.
 */
export function wrapIndex(index: number, length: number): number {
  if (length <= 0) {
    return NO_ACTIVE_INDEX;
  }
  return ((index % length) + length) % length;
}

/**
 * Checks whether a book option matches the current picker query.
 * @param book Book option.
 * @param query Current input query.
 * @returns True when query is empty or label includes query text.
 */
export function matchesQuery(book: Book, query: string): boolean {
  if (!query) {
    return true;
  }
  return optionLabel(book).toLowerCase().includes(query.toLowerCase());
}

/**
 * Resolves the picker result button element from an event target.
 * @param event Mouse/keyboard event from picker UI.
 * @returns Matched result element or null.
 */
export function lookupResultTarget(event: Event): HTMLElement | null {
  if (!(event.target instanceof HTMLElement)) {
    return null;
  }
  return event.target.closest(".book-result");
}

/**
 * Compares two labels after trimming and lowercasing.
 * @param left Left label.
 * @param right Right label.
 * @returns True when labels are equivalent case-insensitively.
 */
export function labelsMatch(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

/**
 * Determines whether picker dropdown should remain open for a click target.
 * @param root0 Interaction location flags.
 * @param root0.targetIsInput True when click target is the picker input.
 * @param root0.targetIsInResults True when click target is inside result list.
 * @returns True when picker should stay open.
 */
export function shouldKeepPickerOpen({
  targetIsInput,
  targetIsInResults,
}: PickerInteraction): boolean {
  if (targetIsInput) {
    return true;
  }
  if (targetIsInResults) {
    return true;
  }
  return false;
}
