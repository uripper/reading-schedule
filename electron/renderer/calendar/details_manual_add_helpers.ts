import type { ManualSessionBook } from "./details_types.js";

/**
 *
 * @param defaultMinutes
 */
export function minuteValueForManualInput(defaultMinutes?: number): string {
  const parsed = Number(defaultMinutes || 0);
  if (Number.isFinite(parsed) && parsed > 0) {
    return `${Math.max(1, Math.round(parsed))}`;
  }
  return "10";
}

/**
 *
 * @param books
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
