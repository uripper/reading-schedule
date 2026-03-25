// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { blockerMeta } from "../dist/renderer/books/presenters.js";

/**
 * Builds minimal book fixture overrides for blocker metadata tests.
 * @param {Record<string, unknown>} overrides - Partial field overrides.
 * @returns {{book_id: string, blocked_by: string|null}} Book fixture.
 */
function book(overrides = {}) {
    return {
        blocked_by: null,
        book_id: "book-a",
        ...overrides,
    };
}

test("blockerMeta returns null when blocker id is missing", () => {
    assert.equal(blockerMeta(book(), {}), null);
});

test("blockerMeta resolves blocker title while keeping blocker id", () => {
    const RESULT = blockerMeta(book({ blocked_by: "book-b" }), {
        "book-b": "Powerful Python",
    });
    assert.deepEqual(RESULT, {
        blockerBookId: "book-b",
        label: "After: Powerful Python",
    });
});

test("blockerMeta falls back to blocker id when title lookup misses", () => {
    const RESULT = blockerMeta(book({ blocked_by: "book-b" }), {});
    assert.deepEqual(RESULT, {
        blockerBookId: "book-b",
        label: "After: book-b",
    });
});
