import type {
    Book,
    ManualSessionBook,
    PlannerResult,
} from "../../../types/types.ts";

/**
 * Returns a new planner result with no scheduled items or summary.
 * This provides a consistent, empty structure to use when no planning data is available.
 * @returns A `PlannerResult` with an empty schedule, null summary, and blank creation timestamp.
 */
export function emptyPlannerResult(): PlannerResult {
    return {
        created_at: "",
        schedule: [],
        summary: null,
    };
}

/**
 * Converts an array of `Book` objects into an array of `ManualSessionBook` objects,
 * which contain only the `bookId` and `title` properties. The resulting array is sorted
 * alphabetically by title. This function is useful for preparing book data for manual
 * session interactions, ensuring that only relevant information is included and that
 * the list is user-friendly.
 * @param books - An array of `Book` objects to be transformed into `ManualSessionBook` objects.
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
