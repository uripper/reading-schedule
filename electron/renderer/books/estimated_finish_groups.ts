import { BOOK_STATUS_DROPPED, BOOK_STATUS_IN_PROGRESS, BOOK_STATUS_READ, BOOK_STATUS_TO_READ } from "./status.js";
import type { BookGroup } from "./grouping.js";
import type { Book } from "./types.js";
import type { StatusGroupDefinition } from "../../types/books_types.js";

const STATUS_GROUPS: StatusGroupDefinition[] = [
  { label: "Dropped", statuses: [BOOK_STATUS_DROPPED] },
  { label: "Read", statuses: [BOOK_STATUS_READ] },
  {
    label: "In Progress / To Read",
    statuses: [BOOK_STATUS_IN_PROGRESS, BOOK_STATUS_TO_READ],
  },
];

/**
 * Buckets estimated-finish-sorted books by status sections for clearer display.
 * @param books Books already sorted by estimated finish.
 * @returns Non-empty ordered status sections for grouped rendering.
 */
export function groupsForEstimatedFinish(books: Book[] = []): BookGroup[] {
  const groups: BookGroup[] = [];
  STATUS_GROUPS.forEach((definition) => {
    const groupedBooks = books.filter((book) => {
      return definition.statuses.includes(book.status);
    });
    if (!groupedBooks.length) {
      return;
    }
    const key = `status:${definition.label.toLowerCase().replaceAll(/\s+/g, "_")}`;
    groups.push({
      key,
      label: definition.label,
      books: groupedBooks,
    });
  });
  return groups;
}
