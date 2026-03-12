import assert from "node:assert/strict";
import test from "node:test";

import {
    buildProgressUpdatePayload,
    logSessionButtonText,
    parseMinutesInput,
    shouldDisableProgressInputs,
} from "../dist/renderer/app/today/today_carousel_actions.js";

const ROW = {
    book_id: "book-1",
    date: "2026-02-21",
    minutes: 25,
    session_index: 1,
    title: "Ulysses",
    words_planned: 2500,
};

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
    assert.equal(logSessionButtonText(false), "Log Session");
    assert.equal(logSessionButtonText(true), "Completed");
    assert.equal(shouldDisableProgressInputs(false), false);
    assert.equal(shouldDisableProgressInputs(true), true);
});

test("parseMinutesInput enforces integer minimum", () => {
    const VALID = parseMinutesInput("35");
    assert.equal(VALID.minutes, 35);
    assert.equal(VALID.error, "");

    const INVALID = parseMinutesInput("0");
    assert.equal(INVALID.minutes, null);
    assert.match(INVALID.error, /at least 1/);
});
