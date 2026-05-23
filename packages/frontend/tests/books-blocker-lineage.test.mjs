// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { booksAfterRemovingBook } from "../dist/renderer/books/blocker-lineage.js";

function book(bookId, blockedBy = null) {
    return {
        author: "",
        blocked_by: blockedBy,
        book_id: bookId,
        cover_local_path: "",
        cover_url: "",
        deadline: null,
        lookup_note: "",
        pages_read: null,
        pages_total: 100,
        progress_percent: 0,
        shelf: "",
        status: "to_read",
        title: bookId,
        words_total: null,
    };
}

function blockersById(books) {
    return Object.fromEntries(
        books.map((entry) => [entry.book_id, entry.blocked_by]),
    );
}

test("removing a middle blocker reconnects dependents to its blocker", () => {
    const BOOKS = [
        book("book-a"),
        book("book-b", "book-a"),
        book("book-c", "book-b"),
    ];
    const NEXT_BOOKS = booksAfterRemovingBook(BOOKS, "book-b");

    assert.deepEqual(blockersById(NEXT_BOOKS), {
        "book-a": null,
        "book-c": "book-a",
    });
});

test("removing the front blocker clears direct dependents", () => {
    const BOOKS = [
        book("book-a"),
        book("book-b", "book-a"),
        book("book-c", "book-b"),
    ];
    const NEXT_BOOKS = booksAfterRemovingBook(BOOKS, "book-a");

    assert.deepEqual(blockersById(NEXT_BOOKS), {
        "book-b": null,
        "book-c": "book-b",
    });
});
