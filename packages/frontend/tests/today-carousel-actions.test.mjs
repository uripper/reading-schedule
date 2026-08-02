// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import {
    buildProgressUpdatePayload,
    logSessionButtonText,
    parseMinutesInput,
} from "../dist/renderer/app/today/today_carousel_actions.js";
import { addBookHandler } from "../dist/renderer/app/today/today_carousel_add_book.js";

const ROW = {
    book_id: "book-1",
    date: "2026-02-21",
    minutes: 25,
    session_index: 1,
    title: "Ulysses",
    words_planned: 2500,
};
const NOOP = () => undefined;

test("buildProgressUpdatePayload includes changed pages and percent", () => {
    const RESULT = buildProgressUpdatePayload({
        bookId: "book-1",
        currentPagesRead: 100,
        currentPagesTotal: 300,
        currentPercent: 10,
        draft: {
            pagesText: "120",
            percentText: "12.5",
        },
        row: ROW,
    });

    assert.equal(RESULT.valid, true);
    assert.equal(RESULT.payload.pagesRead, 120);
    assert.equal(RESULT.payload.progressPercent, 12.5);
});

test("buildProgressUpdatePayload omits unchanged fields", () => {
    const RESULT = buildProgressUpdatePayload({
        bookId: "book-1",
        currentPagesRead: 120,
        currentPagesTotal: 300,
        currentPercent: 12.5,
        draft: {
            pagesText: "120",
            percentText: "12.5",
        },
        row: ROW,
    });

    assert.equal(RESULT.valid, true);
    assert.equal(RESULT.payload.pagesRead, undefined);
    assert.equal(RESULT.payload.progressPercent, undefined);
});

test("buildProgressUpdatePayload validates invalid progress values", () => {
    const RESULT = buildProgressUpdatePayload({
        bookId: "book-1",
        currentPagesRead: 0,
        currentPagesTotal: 300,
        currentPercent: 0,
        draft: {
            pagesText: "10",
            percentText: "150",
        },
        row: ROW,
    });

    assert.equal(RESULT.valid, false);
    assert.match(RESULT.error, /between 0 and 100/);
});

test("buildProgressUpdatePayload treats blank chip inputs as unchanged progress", () => {
    const RESULT = buildProgressUpdatePayload({
        bookId: "book-1",
        currentPagesRead: 120,
        currentPagesTotal: 300,
        currentPercent: 12.5,
        draft: {
            pagesText: "",
            percentText: "",
        },
        row: ROW,
    });

    assert.equal(RESULT.valid, true);
    assert.equal(RESULT.payload.pagesRead, undefined);
    assert.equal(RESULT.payload.progressPercent, undefined);
});

test("buildProgressUpdatePayload rejects pages above the known total", () => {
    const RESULT = buildProgressUpdatePayload({
        bookId: "book-1",
        currentPagesRead: 120,
        currentPagesTotal: 300,
        currentPercent: 12.5,
        draft: {
            pagesText: "301",
            percentText: "12.5",
        },
        row: ROW,
    });

    assert.equal(RESULT.valid, false);
    assert.match(RESULT.error, /cannot exceed total pages/i);
});

test("button and disable helpers mirror completed state", () => {
    assert.equal(logSessionButtonText(false), "Complete session");
    assert.equal(logSessionButtonText(true), "Reopen session");
});

test("parseMinutesInput enforces integer minimum", () => {
    const VALID = parseMinutesInput("35");
    assert.equal(VALID.minutes, 35);
    assert.equal(VALID.error, "");

    const INVALID = parseMinutesInput("0");
    assert.equal(INVALID.minutes, null);
    assert.match(INVALID.error, /at least 1/);
});

test("addBookHandler appears when library books are available for Today", () => {
    const HANDLER = addBookHandler({
        bindings: {
            listSessionBooks: () => {
                return [{ bookId: "book-1", title: "Book 1" }];
            },
            onManualSessionAdded: () => true,
            rerender: NOOP,
            setStatus: NOOP,
        },
        books: [{ book_id: "book-1", title: "Book 1" }],
        modelBooks: [],
    });

    assert.equal(typeof HANDLER, "function");
});

test("addBookHandler is hidden when every library book is already in Today", () => {
    const HANDLER = addBookHandler({
        bindings: {
            listSessionBooks: () => {
                return [{ bookId: "book-1", title: "Book 1" }];
            },
            onManualSessionAdded: () => true,
            rerender: NOOP,
            setStatus: NOOP,
        },
        books: [{ book_id: "book-1", title: "Book 1" }],
        modelBooks: [{ bookId: "book-1" }],
    });

    assert.equal(HANDLER, undefined);
});
