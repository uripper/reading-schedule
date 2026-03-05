import assert from "node:assert/strict";
import test from "node:test";

import { clearMissingBlockedBy } from "../dist/renderer/books/model_payload.js";

/**
 * Builds minimal test book payload.
 * @param {Record<string, unknown>} overrides - Field overrides.
 * @returns {{book_id: string, blocked_by: string|null}} Book fixture.
 */
function book(overrides = {}) {
    return {
        blocked_by: null,
        book_id: "book-id",
        ...overrides,
    };
}

test("clearMissingBlockedBy keeps blocker ids that are still schedulable", () => {
    const BOOKS = [
        book({ book_id: "book-a" }),
        book({ blocked_by: "book-a", book_id: "book-b" }),
    ];

    const RESULT = clearMissingBlockedBy(BOOKS);
    assert.equal(RESULT[1].blocked_by, "book-a");
});

test("clearMissingBlockedBy clears blocker ids that are missing", () => {
    const BOOKS = [book({ blocked_by: "book-a", book_id: "book-b" })];

    const RESULT = clearMissingBlockedBy(BOOKS);
    assert.equal(RESULT[0].blocked_by, null);
});
