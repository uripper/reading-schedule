/** Shared library fixtures for the collections test files. */
import { normalizeBook } from "../../dist/renderer/books/model-normalize.js";

export function book(overrides = {}) {
    return normalizeBook({
        book_id: overrides.book_id ?? "book",
        title: overrides.title ?? "A Book",
        words_total: 1000,
        ...overrides,
    });
}

export const LIBRARY = [
    book({ book_id: "a", collections: ["Classics", "Summer"], shelf: "Home" }),
    book({ book_id: "b", collections: ["summer"], shelf: "Home" }),
    book({ book_id: "c", shelf: "Work" }),
];
