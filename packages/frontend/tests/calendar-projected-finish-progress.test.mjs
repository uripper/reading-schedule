// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { markBookStartedForCompletedRow } from "../dist/renderer/app/calendar_interactions/calendar-interactions-completion-books.js";

function updateArgs(updates, updatedBook) {
    return {
        onProgressUpdated: () => undefined,
        updateBookProgress: (bookId, changes, options) => {
            updates.push({ bookId, changes, options });
            return updatedBook;
        },
    };
}

test("completing a projected finish does not force book progress to 100 percent", () => {
    const Updates = [];
    const UPDATED_BOOK = { book_id: "book-1", progress_percent: 98 };
    markBookStartedForCompletedRow(updateArgs(Updates, UPDATED_BOOK), {
        completed: true,
        row: {
            book_id: "book-1",
            date: "2026-08-11",
            finish: true,
        },
        sessionKey: "2026-08-11|1|book-1",
    });

    assert.deepEqual(Updates, [
        {
            bookId: "book-1",
            changes: {},
            options: {
                markStarted: true,
                notifyBooksChanged: false,
            },
        },
    ]);
});
