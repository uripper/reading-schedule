// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { applyBulkBookUpdates } from "../dist/renderer/books/bulk-edit-updates.js";
import { nextBooksAfterDialogSave } from "../dist/renderer/books/controller-save.js";
import { isBulkDialogMode } from "../dist/renderer/books/dialog-display.js";
import { wrappedBookDialogIndex } from "../dist/renderer/books/dialog-navigation.js";

const BASE_BOOK = {
    author: "Author",
    blocked_by: null,
    book_id: "book-1",
    cover_local_path: "/covers/original.jpg",
    cover_url: "https://example.com/original.jpg",
    deadline: null,
    difficulty: 3,
    finished_at: null,
    lookup_note: "lookup",
    max_minutes_per_day: null,
    min_blocks_per_session: 1,
    pages_read: 0,
    pages_total: 200,
    priority: 3,
    progress_percent: 0,
    scheduled_days: ["Mon", "Tue"],
    shelf: "Shelf",
    status: "to_read",
    title: "Original Title",
    words_total: 60000,
};

function book(overrides = {}) {
    return { ...BASE_BOOK, ...overrides };
}

function editableFieldUpdates() {
    return {
        author: "Shared Author",
        cover_url: "ignored by caller contract",
        deadline: "2026-08-01",
        shelf: "New Shelf",
        status: "read",
        title: "ignored by caller contract",
    };
}

function assertFirstBulkBook(result) {
    assert.equal(result[0].author, "Shared Author");
    assert.equal(result[0].deadline, "2026-08-01");
    assert.equal(result[0].shelf, "New Shelf");
    assert.equal(result[0].status, "read");
    assert.equal(result[0].progress_percent, 100);
    assert.equal(result[0].pages_read, 200);
    assert.equal(result[0].title, "Keep Title 1");
    assert.equal(result[0].cover_url, "https://example.com/original.jpg");
}

test("applyBulkBookUpdates changes selected editable fields only", () => {
    const BOOKS = [
        book({ book_id: "book-1", title: "Keep Title 1" }),
        book({ book_id: "book-2", title: "Keep Title 2" }),
        book({ book_id: "book-3", title: "Unchanged" }),
    ];

    const RESULT = applyBulkBookUpdates(
        BOOKS,
        ["book-1", "book-2"],
        editableFieldUpdates(),
    );

    assertFirstBulkBook(RESULT);
    assert.equal(RESULT[1].author, "Shared Author");
    assert.equal(RESULT[1].title, "Keep Title 2");
    assert.equal(RESULT[2], BOOKS[2]);
});

test("applyBulkBookUpdates prevents a selected book from blocking itself", () => {
    const RESULT = applyBulkBookUpdates(
        [book({ book_id: "book-1" }), book({ book_id: "book-2" })],
        ["book-1", "book-2"],
        { blocked_by: "book-1" },
    );

    assert.equal(RESULT[0].blocked_by, null);
    assert.equal(RESULT[1].blocked_by, "book-1");
});

test("bulk scheduled-day edits stay scoped to selected books", async () => {
    const BOOKS = [
        book({ book_id: "book-1", shelf: "Shared" }),
        book({ book_id: "book-2", shelf: "Shared" }),
    ];

    const RESULT = await nextBooksAfterDialogSave(BOOKS, {
        bookIds: ["book-1"],
        type: "bulk_books",
        updates: { scheduled_days: ["Fri"] },
    });

    assert.deepEqual(RESULT[0].scheduled_days, ["Fri"]);
    assert.deepEqual(RESULT[1].scheduled_days, ["Mon", "Tue"]);
});

test("wrappedBookDialogIndex wraps visible edit navigation", () => {
    const IDS = ["book-1", "book-2", "book-3"];

    assert.equal(wrappedBookDialogIndex(IDS, "book-1", -1), 2);
    assert.equal(wrappedBookDialogIndex(IDS, "book-3", 1), 0);
    assert.equal(wrappedBookDialogIndex(IDS, "missing", 1), -1);
});

test("isBulkDialogMode treats multi-book selections as bulk edits", () => {
    assert.equal(isBulkDialogMode({ mode: "bulk" }), true);
    assert.equal(
        isBulkDialogMode({ bulkBookIds: ["book-1", "book-2"] }),
        true,
    );
    assert.equal(isBulkDialogMode({ bulkBookIds: ["book-1"] }), false);
});
