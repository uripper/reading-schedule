import assert from "node:assert/strict";
import test from "node:test";

import { booksMatchingTitleQuery } from "../dist/renderer/calendar/details_manual_add_helpers.js";

const SAMPLE_BOOKS = [
    { bookId: "1", title: "Against Interpretation" },
    { bookId: "2", title: "The Savage Detectives" },
    { bookId: "3", title: "As I Lay Dying" },
];

test("booksMatchingTitleQuery returns all books for empty query", () => {
    const RESULTS = booksMatchingTitleQuery(SAMPLE_BOOKS, "");
    assert.deepEqual(RESULTS, SAMPLE_BOOKS);
});

test("booksMatchingTitleQuery narrows by case-insensitive substring", () => {
    const ONE_LETTER = booksMatchingTitleQuery(SAMPLE_BOOKS, "a");
    assert.equal(ONE_LETTER.length, 3);

    const AGAINST = booksMatchingTitleQuery(SAMPLE_BOOKS, "against");
    assert.equal(AGAINST.length, 1);
    assert.equal(AGAINST[0].bookId, "1");

    const NO_MATCHES = booksMatchingTitleQuery(SAMPLE_BOOKS, "zzzz");
    assert.equal(NO_MATCHES.length, 0);
});
