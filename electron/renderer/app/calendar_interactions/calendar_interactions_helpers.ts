import type { Book } from "../../../types/types_books.js";

import type { PlannerResult } from "../../../types/types.js";
import type { ManualSessionBook } from "../../../types/types_app.js";

export {
  dayBookCompletionKey,
  dayBookCompletionKeyFromSession,
} from "./calendar_interactions_key_helpers.js";
export {
  DEFAULT_BOOK_DIFFICULTY,
  normalizedManualMinutes,
  wordsPlannedForManualSession,
} from "./calendar_interactions_manual_helpers.js";
export {
  nextSessionIndexForDate,
  rowsWithoutSession,
} from "./calendar_interactions_row_helpers.js";

/**
 * Returns a new planner result with no scheduled items or summary.
 * This provides a consistent, empty structure to use when no planning data is available.
 * @returns A `PlannerResult` with an empty schedule, null summary, and blank creation timestamp.
 */
export function emptyPlannerResult(): PlannerResult {
  return {
    schedule: [],
    summary: null,
    created_at: "",
  };
}

/**
 * Converts an array of `Book` objects into an array of `ManualSessionBook` objects,
 * which contain only the `bookId` and `title` properties. The resulting array is sorted
 * alphabetically by title. This function is useful for preparing book data for manual
 * session interactions, ensuring that only relevant information is included and that
 * the list is user-friendly.
 * @param books An array of `Book` objects to be transformed into `ManualSessionBook` objects.
 * @returns An array of `ManualSessionBook` objects, sorted by title.
 */
export function manualSessionBooks(books: Book[] = []): ManualSessionBook[] {
  return books
    .map((book) => ({
      bookId: String(book.book_id || ""),
      title: String(book.title || "").trim(),
    }))
    .filter((book) => book.bookId && book.title)
    .sort((left, right) => {
      return left.title.localeCompare(right.title, undefined, {
        sensitivity: "base",
      });
    });
}
