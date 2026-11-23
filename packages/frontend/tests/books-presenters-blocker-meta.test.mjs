import assert from "node:assert/strict";
import test from "node:test";

import {
    blockerMeta,
    shortBookTitle,
} from "../dist/renderer/books/presenters.js";

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
        fullTitle: "Powerful Python",
        label: "After: Powerful Python",
    });
});

test("blockerMeta falls back to blocker id when title lookup misses", () => {
    const RESULT = blockerMeta(book({ blocked_by: "book-b" }), {});
    assert.deepEqual(RESULT, {
        blockerBookId: "book-b",
        fullTitle: "book-b",
        label: "After: book-b",
    });
});

test("blockerMeta shortens the card label but keeps the full title for the tooltip", () => {
    const RESULT = blockerMeta(book({ blocked_by: "book-b" }), {
        "book-b": "Dune: Messiah of the Desert",
    });
    assert.equal(RESULT.label, "After: Dune");
    assert.equal(RESULT.fullTitle, "Dune: Messiah of the Desert");
});

test("shortBookTitle drops a subtitle after a colon or spaced dash only", () => {
    assert.equal(shortBookTitle("Dune - Book One"), "Dune");
    assert.equal(shortBookTitle("Slaughterhouse-Five"), "Slaughterhouse-Five");
    assert.equal(shortBookTitle(": Untitled"), ": Untitled");
});
