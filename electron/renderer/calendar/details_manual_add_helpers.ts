import type { ManualSessionBook } from "./details_types.js";

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
