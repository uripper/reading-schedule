import type {
    Book,
    BookGroup,
    StatusGroupDefinition,
} from "../../types/types.js";
import {
    BOOK_STATUS_DROPPED,
    BOOK_STATUS_IN_PROGRESS,
    BOOK_STATUS_READ,
    BOOK_STATUS_TO_READ,
} from "./status_catalog.js";

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
    const GROUPS: BookGroup[] = [];

    STATUS_GROUPS.forEach((definition) => {
        const GROUPED_BOOKS = books.filter((book) => {
            return definition.statuses.includes(book.status);
        });
        if (!GROUPED_BOOKS.length) {
            return;
        }
        const KEY = `status:${definition.label.toLowerCase().replaceAll(/\s+/g, "_")}`;
        GROUPS.push({
            books: GROUPED_BOOKS,
            key: KEY,
            label: definition.label,
        });
    });
    return GROUPS;
}
