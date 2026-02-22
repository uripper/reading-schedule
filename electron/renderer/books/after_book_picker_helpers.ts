import type { Book } from "./types.js";

const NO_ACTIVE_INDEX = -1;

interface PickerInteraction {
  targetIsInput: boolean;
  targetIsInResults: boolean;
}

/**
 *
 * @param book
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
 *
 * @param left
 * @param right
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
 *
 * @param index
 * @param length
 */
export function wrapIndex(index: number, length: number): number {
  if (length <= 0) {
    return NO_ACTIVE_INDEX;
  }
  return ((index % length) + length) % length;
}

/**
 *
 * @param book
 * @param query
 */
export function matchesQuery(book: Book, query: string): boolean {
  if (!query) {
    return true;
  }
  return optionLabel(book).toLowerCase().includes(query.toLowerCase());
}

/**
 *
 * @param event
 */
export function lookupResultTarget(event: Event): HTMLElement | null {
  if (!(event.target instanceof HTMLElement)) {
    return null;
  }
  return event.target.closest(".book-result");
}

/**
 *
 * @param left
 * @param right
 */
export function labelsMatch(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

/**
 *
 * @param root0
 * @param root0.targetIsInput
 * @param root0.targetIsInResults
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
